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
import {
  LucideArrowLeft,
  LucideStar,
  LucideEllipsis,
  LucideTrash2,
  LucideHistory,
  LucideClock,
  LucideCircleCheck,
  LucideCloudOff,
  LucideLoader,
  LucideFolder,
} from '@lucide/angular';
import { NotesService } from '../../../core/services/notes.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { RevisionsService } from '../../../core/services/revisions.service';
import { BlockEditor } from '../../../shared/components/block-editor/block-editor';
import { ConfidenceIndicator } from '../../../shared/components/confidence-indicator/confidence-indicator';
import { Modal } from '../../../shared/components/modal/modal';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
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
const CONFIDENCE_ORDER: ConfidenceLevel[] = ['need_practice', 'getting_there', 'confident'];

@Component({
  selector: 'app-note-page',
  imports: [
    DatePipe,
    LucideArrowLeft, LucideStar, LucideEllipsis, LucideTrash2, LucideHistory, LucideClock,
    LucideCircleCheck, LucideCloudOff, LucideLoader, LucideFolder,
    BlockEditor,
    ConfidenceIndicator,
    Modal,
    Skeleton,
  ],
  templateUrl: './note-page.html',
  styleUrl: './note-page.scss',
})
export class NotePage implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private revisionsService = inject(RevisionsService);
  private destroyRef = inject(DestroyRef);

  private readonly editor = viewChild(BlockEditor);
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
  protected readonly menuOpen = signal(false);
  protected readonly showDeleteConfirm = signal(false);
  protected readonly deleting = signal(false);

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
        if (this.noteId() !== null) this.flush();
        this.resetForNew();
        return;
      }
      // Our own redirect after creating the note: keep editor state as-is.
      if (id === this.noteId()) return;
      this.flush();
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

  private resetForNew(): void {
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
    this.clearTimers();
    this.loading.set(true);
    this.notesService.getById(id).subscribe({
      next: (note) => this.applyNote(note),
      error: () => this.router.navigate(['/my-notes']),
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

  protected onCategoryChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.categoryId.set(id);
    try {
      localStorage.setItem(LAST_CATEGORY_KEY, id);
    } catch {
      /* storage unavailable */
    }
    this.flush();
  }

  protected cycleConfidence(): void {
    const i = CONFIDENCE_ORDER.indexOf(this.confidence());
    this.confidence.set(CONFIDENCE_ORDER[(i + 1) % CONFIDENCE_ORDER.length]);
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

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.deleted || (!this.inFlight && !this.isDirty())) return;
    this.flush();
    event.preventDefault();
    event.returnValue = '';
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    // Fire the pending save; the request completes even though the page is gone.
    this.flush();
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  // ---------- Menu / delete / nav ----------

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((o) => !o);
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected askDelete(): void {
    this.menuOpen.set(false);
    this.showDeleteConfirm.set(true);
  }

  protected onDelete(): void {
    const id = this.noteId();
    if (!id) return;
    this.deleting.set(true);
    this.notesService.delete(id).subscribe({
      next: () => {
        this.deleted = true;
        this.clearTimers();
        this.router.navigate(['/my-notes']);
      },
      error: () => {
        this.deleting.set(false);
        this.showDeleteConfirm.set(false);
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/my-notes']);
  }
}
