import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft, lucideBookmark, lucideEllipsis, lucideTrash2, lucideHistory, lucideClock,
  lucideCircleCheck, lucideCloudOff, lucideLoaderCircle, lucideListTree, lucideX,
} from '@ng-icons/lucide';
import { NoteToc } from '../../../shared/components/note-toc/note-toc';
import type { EditorHeading } from '../../../shared/components/block-editor/block-editor';
import { ZardButtonComponent } from '@/shared/ui/button';
import { ZardSkeletonComponent } from '@/shared/ui/skeleton';
import { ZardDropdownImports } from '@/shared/ui/dropdown';
import { AppSelect } from '../../../shared/components/select/select';
import type { SelectOption } from '../../../shared/components/select/select-option';
import { NotesService } from '../../../core/services/notes.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { RevisionsService } from '../../../core/services/revisions.service';
import { BlockEditor } from '../../../shared/components/block-editor/block-editor';
import { Modal } from '../../../shared/components/modal/modal';
import { deriveLegacyFields, noteToMarkdown } from '../../../shared/note-markdown';
import type { Category, ConfidenceLevel, Note, UpdateNotePayload } from '../../../core/models';

/** Persisted fields the page edits. */
interface Snapshot {
  title: string;
  body_markdown: string;
  category_id: string;
  confidence_level: ConfidenceLevel;
  is_favorite: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DEBOUNCE_MS = 800;
const RETRY_MS = 5000;
const LAST_CATEGORY_KEY = 'prepvault:lastCategory';

@Component({
  selector: 'app-note-page',
  imports: [
    DatePipe,
    NgIcon,
    ZardButtonComponent,
    ZardSkeletonComponent,
    ...ZardDropdownImports,
    AppSelect,
    NoteToc,
    BlockEditor,
    Modal,
  ],
  templateUrl: './note-page.html',
  viewProviders: [
    provideIcons({
      lucideArrowLeft, lucideBookmark, lucideEllipsis, lucideTrash2, lucideHistory, lucideClock,
      lucideCircleCheck, lucideCloudOff, lucideLoaderCircle, lucideListTree, lucideX,
      bookmarkSolid:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
    }),
  ],
})
export class NotePage implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private revisionsService = inject(RevisionsService);
  private destroyRef = inject(DestroyRef);

  private readonly editor = viewChild(BlockEditor);

  // ---------- Table of contents ----------
  /** Hidden by default; opened from the top-bar button or Ctrl/Cmd+Shift+O. */
  protected readonly tocOpen = signal(false);
  protected readonly headings = signal<EditorHeading[]>([]);
  /** dock = side panel (≥1280px), overlay = card over the page (768–1279px), sheet = bottom sheet (<768px). */
  protected readonly tocMode = signal<'dock' | 'overlay' | 'sheet'>(this.currentTocMode());
  private readonly titleRef = viewChild<ElementRef<HTMLTextAreaElement>>('titleInput');

  protected readonly noteId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly categories = signal<Category[]>([]);

  protected readonly title = signal('');
  /** Markdown handed to the editor on load; the editor owns the body afterwards. */
  protected readonly initialBody = signal('');
  /** Bumped whenever a different note (or a blank one) is shown, to recreate the editor. */
  protected readonly editorKey = signal(0);
  protected readonly categoryId = signal('');
  protected readonly confidence = signal<ConfidenceLevel>('need_practice');
  protected readonly favorite = signal(false);
  protected readonly updatedAt = signal<string | null>(null);
  protected readonly revisionCount = signal<number | null>(null);
  protected readonly markingRevised = signal(false);
  protected readonly justRevised = signal(false);

  protected readonly saveStatus = signal<SaveStatus>('idle');
  protected readonly showDeleteConfirm = signal(false);
  protected readonly deleting = signal(false);

  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    this.categories().map((c) => ({ value: c.id, label: c.name, icon: c.icon, color: c.color })),
  );

  protected readonly confidenceOptions: SelectOption[] = [
    { value: 'need_practice', label: 'Need practice', dot: true, color: 'var(--confidence-need-practice)' },
    { value: 'getting_there', label: 'Getting there', dot: true, color: 'var(--confidence-getting-there)' },
    { value: 'confident', label: 'Confident', dot: true, color: 'var(--confidence-confident)' },
  ];

  protected readonly isNew = computed(() => this.noteId() === null);
  protected readonly category = computed(
    () => this.categories().find((c) => c.id === this.categoryId()) ?? null,
  );

  private body = '';
  /** Last persisted state; null while the note does not exist yet. */
  private saved: Snapshot | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private queued = false;
  private destroyed = false;
  private deleted = false;

  constructor() {
    this.loadCategories();

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (!id || id === 'new') {
        if (this.noteId() !== null && !this.discardIfEmpty()) this.flush();
        this.resetForNew();
        return;
      }
      // Our own redirect after creating the note: keep editor state as-is.
      if (id === this.noteId()) return;
      if (!this.discardIfEmpty()) this.flush();
      this.loadNote(id);
    });

    // Auto-grow the title textarea.
    afterRenderEffect(() => {
      this.title();
      this.loading();
      const el = this.titleRef()?.nativeElement;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }

  // ---------- Loading ----------

  private loadCategories(): void {
    this.categoriesService.seedDefaults().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        if (!this.categoryId()) this.categoryId.set(this.defaultCategoryId());
        // A new note typed before categories arrived is waiting for a category.
        if (this.isNew() && this.isDirty()) this.scheduleSave();
      },
      error: () => this.categories.set([]),
    });
  }

  private defaultCategoryId(): string {
    const cats = this.categories();
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_CATEGORY_KEY);
    } catch {
      /* storage unavailable */
    }
    return cats.find((c) => c.id === last)?.id ?? cats[0]?.id ?? '';
  }

  private currentTocMode(): 'dock' | 'overlay' | 'sheet' {
    if (typeof window === 'undefined') return 'dock';
    if (window.matchMedia('(min-width: 1280px)').matches) return 'dock';
    return window.matchMedia('(min-width: 768px)').matches ? 'overlay' : 'sheet';
  }

  @HostListener('window:resize')
  protected onResize(): void {
    this.tocMode.set(this.currentTocMode());
  }

  protected toggleToc(): void {
    this.tocMode.set(this.currentTocMode());
    this.tocOpen.update((o) => !o);
  }

  protected jumpToHeading(pos: number): void {
    this.editor()?.scrollToHeading(pos);
    if (this.tocMode() !== 'dock') this.tocOpen.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  protected onTocShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      this.toggleToc();
    } else if (event.key === 'Escape' && this.tocOpen() && this.tocMode() !== 'dock') {
      this.tocOpen.set(false);
    }
  }

  private resetForNew(): void {
    this.tocOpen.set(false);
    this.clearTimers();
    this.noteId.set(null);
    this.saved = null;
    this.body = '';
    this.title.set('');
    this.initialBody.set('');
    this.editorKey.update((k) => k + 1);
    this.categoryId.set(this.defaultCategoryId());
    this.confidence.set('need_practice');
    this.favorite.set(false);
    this.updatedAt.set(null);
    this.revisionCount.set(null);
    this.saveStatus.set('idle');
    this.loading.set(false);
    setTimeout(() => this.titleRef()?.nativeElement.focus());
  }

  private loadNote(id: string): void {
    this.tocOpen.set(false);
    this.clearTimers();
    this.loading.set(true);
    this.notesService.getById(id).subscribe({
      next: (note) => this.applyNote(note),
      error: () => this.router.navigate(['/notes']),
    });
    this.revisionsService.getRevisionCount(id).subscribe({
      next: (count) => this.revisionCount.set(count),
      error: () => this.revisionCount.set(null),
    });
  }

  private applyNote(note: Note): void {
    const body = noteToMarkdown(note);
    this.noteId.set(note.id);
    this.body = body;
    this.title.set(note.title ?? '');
    this.initialBody.set(body);
    this.editorKey.update((k) => k + 1);
    this.categoryId.set(note.category_id);
    this.confidence.set(note.confidence_level);
    this.favorite.set(note.is_favorite);
    this.updatedAt.set(note.updated_at);
    this.saved = this.current();
    this.saveStatus.set('idle');
    this.loading.set(false);
  }

  // ---------- Edits ----------

  protected onTitleInput(event: Event): void {
    this.title.set((event.target as HTMLTextAreaElement).value);
    this.scheduleSave();
  }

  protected onTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || (event.key === 'ArrowDown' && this.caretAtEnd(event))) {
      event.preventDefault();
      this.editor()?.focus('start');
    }
  }

  private caretAtEnd(event: KeyboardEvent): boolean {
    const el = event.target as HTMLTextAreaElement;
    return el.selectionStart === el.value.length;
  }

  protected onBodyChange(markdown: string): void {
    this.body = markdown;
    this.scheduleSave();
  }

  protected onCategoryChange(id: string | null): void {
    if (!id) return;
    this.categoryId.set(id);
    try {
      localStorage.setItem(LAST_CATEGORY_KEY, id);
    } catch {
      /* storage unavailable */
    }
    this.flush();
  }

  protected onConfidenceChange(level: string | null): void {
    if (!level || level === this.confidence()) return;
    this.confidence.set(level as ConfidenceLevel);
    this.flush();
  }

  protected toggleFavorite(): void {
    this.favorite.update((f) => !f);
    this.flush();
  }

  protected markRevised(): void {
    const id = this.noteId();
    if (!id || this.markingRevised()) return;
    this.markingRevised.set(true);
    this.revisionsService.log(id).subscribe({
      next: () => {
        this.revisionCount.update((c) => (c ?? 0) + 1);
        this.markingRevised.set(false);
        this.justRevised.set(true);
        setTimeout(() => this.justRevised.set(false), 2000);
      },
      error: () => this.markingRevised.set(false),
    });
  }

  // ---------- Autosave ----------

  private current(): Snapshot {
    return {
      title: this.title(),
      body_markdown: this.body,
      category_id: this.categoryId(),
      confidence_level: this.confidence(),
      is_favorite: this.favorite(),
    };
  }

  private changes(cur: Snapshot): UpdateNotePayload {
    const saved = this.saved;
    if (!saved) return {};
    const payload: UpdateNotePayload = {};
    if (cur.title !== saved.title) payload.title = cur.title;
    if (cur.category_id !== saved.category_id) payload.category_id = cur.category_id;
    if (cur.confidence_level !== saved.confidence_level) payload.confidence_level = cur.confidence_level;
    if (cur.is_favorite !== saved.is_favorite) payload.is_favorite = cur.is_favorite;
    if (cur.body_markdown !== saved.body_markdown) {
      Object.assign(payload, { body_markdown: cur.body_markdown }, deriveLegacyFields(cur.body_markdown));
    }
    return payload;
  }

  private hasContent(cur: Snapshot): boolean {
    return cur.title.trim().length > 0 || cur.body_markdown.trim().length > 0;
  }

  private isDirty(): boolean {
    const cur = this.current();
    if (this.saved === null) return this.hasContent(cur);
    return Object.keys(this.changes(cur)).length > 0;
  }

  private scheduleSave(): void {
    if (this.deleted) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.isDirty()) this.saveStatus.set('saving');
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
  }

  private clearTimers(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.saveTimer = this.retryTimer = null;
  }

  /** Persist pending changes now. Safe to call repeatedly; no-op when nothing changed. */
  private flush(): void {
    this.clearTimers();
    if (this.deleted) return;
    if (this.inFlight) {
      this.queued = true;
      return;
    }
    const cur = this.current();

    if (this.saved === null) {
      // New note: never persist an empty one.
      if (!this.hasContent(cur)) {
        this.saveStatus.set('idle');
        return;
      }
      if (!cur.category_id) {
        // Categories still loading; loadCategories() re-triggers the save.
        this.saveStatus.set('saving');
        return;
      }
      this.inFlight = true;
      this.saveStatus.set('saving');
      this.notesService
        .create({ ...cur, ...deriveLegacyFields(cur.body_markdown) })
        .subscribe({
          next: (note) => {
            this.saved = cur;
            this.noteId.set(note.id);
            this.updatedAt.set(note.updated_at);
            this.revisionCount.set(0);
            if (!this.destroyed) {
              this.router.navigate(['/notes', note.id], { replaceUrl: true });
            }
            this.afterSave();
          },
          error: () => this.onSaveError(),
        });
      return;
    }

    // Existing note cleared to nothing: keep the last real content in the DB for now;
    // it is deleted when the user leaves the note (discardIfEmpty), not mid-edit.
    if (!this.hasContent(cur)) {
      this.saveStatus.set('idle');
      return;
    }

    const payload = this.changes(cur);
    if (Object.keys(payload).length === 0) {
      if (this.saveStatus() === 'saving') this.saveStatus.set('saved');
      return;
    }
    const id = this.noteId()!;
    this.inFlight = true;
    this.saveStatus.set('saving');
    this.notesService.update(id, payload).subscribe({
      next: (note) => {
        this.saved = cur;
        // Ignore late responses from a previously open note.
        if (this.noteId() === id) this.updatedAt.set(note.updated_at);
        this.afterSave();
      },
      error: () => this.onSaveError(),
    });
  }

  private afterSave(): void {
    this.inFlight = false;
    if (this.queued || this.isDirty()) {
      this.queued = false;
      if (this.saveTimer === null) this.flush();
      return;
    }
    this.saveStatus.set('saved');
  }

  private onSaveError(): void {
    this.inFlight = false;
    this.queued = false;
    this.saveStatus.set('error');
    if (!this.destroyed) this.retryTimer = setTimeout(() => this.flush(), RETRY_MS);
  }

  /** Ctrl/Cmd+S: save now instead of waiting for the autosave debounce. */
  @HostListener('window:keydown', ['$event'])
  protected onSaveShortcut(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 's') return;
    event.preventDefault(); // never open the browser's "Save page" dialog
    if (this.deleted || this.loading()) return;

    const dirty = this.isDirty();
    this.flush();
    // Existing note with nothing new to persist: still confirm it's saved.
    if (!dirty && !this.inFlight && this.saved !== null) this.saveStatus.set('saved');
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.discardIfEmpty()) return;
    if (this.deleted || (!this.inFlight && !this.isDirty())) return;
    this.flush();
    event.preventDefault();
    event.returnValue = '';
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    // Fire the pending save (or the empty-note delete); requests complete after the page is gone.
    if (!this.discardIfEmpty()) this.flush();
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  // ---------- Menu / delete / nav ----------

  protected askDelete(): void {
    this.showDeleteConfirm.set(true);
  }

  /**
   * Leaving a saved note whose title and body are both empty deletes it, so cleared
   * notes don't pile up as "Untitled". Returns true when the note was discarded.
   */
  private discardIfEmpty(): boolean {
    const id = this.noteId();
    if (!id || this.saved === null || this.deleted || this.hasContent(this.current())) return false;
    this.clearTimers();
    this.saved = null; // nothing left to persist for this note
    this.queued = false;
    this.notesService.delete(id).subscribe({ error: () => undefined });
    return true;
  }

  protected onDelete(): void {
    const id = this.noteId();
    if (!id) return;
    this.deleting.set(true);
    this.notesService.delete(id).subscribe({
      next: () => {
        this.deleted = true;
        this.clearTimers();
        this.router.navigate(['/notes']);
      },
      error: () => {
        this.deleting.set(false);
        this.showDeleteConfirm.set(false);
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/notes']);
  }
}
