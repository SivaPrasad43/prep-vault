import { Component, ElementRef, HostListener, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, filter, switchMap } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFlame, lucideSearch, lucideX, lucideBookOpenText, lucideChevronRight, lucideCheck } from '@ng-icons/lucide';
import { ZardSkeletonComponent } from '@/shared/ui/skeleton';
import { NoteCard } from '../../shared/components/note-card/note-card';
import { AppSelect } from '../../shared/components/select/select';
import { StreakFlame } from '../../shared/components/streak-flame/streak-flame';
import { StreakPanel } from '../../shared/components/streak-panel/streak-panel';
import { GamificationService } from '../../core/services/gamification.service';
import { CategoryDialog } from '../../shared/components/category-dialog/category-dialog';
import type { SelectOption } from '../../shared/components/select/select-option';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { NotesService } from '../../core/services/notes.service';
import { CategoriesService } from '../../core/services/categories.service';
import { FilterStateService } from '../../core/services/filter-state.service';
import type { Category, ConfidenceLevel, Note, NoteFilters, NoteStats } from '../../core/models';

/**
 * Gmail-style notes workspace.
 * Desktop (lg+): note list on the left, selected note (child route) on the right.
 * Below lg: the list alone, or the open note alone.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet, RouterLink, NgIcon, ZardSkeletonComponent, NoteCard, EmptyState, AppSelect, CategoryDialog, StreakFlame, StreakPanel],
  templateUrl: './dashboard.html',
  viewProviders: [provideIcons({ lucideFlame, lucideSearch, lucideX, lucideBookOpenText, lucideChevronRight, lucideCheck })],
  host: { class: 'block' },
})
export class Dashboard implements OnInit {
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private router = inject(Router);
  protected filterState = inject(FilterStateService);
  private readonly PAGE_SIZE = 20;

  protected displayedNotes = signal<Note[]>([]);
  /** Live from the shared store, so new/renamed/deleted categories show up everywhere. */
  protected readonly categories = this.categoriesService.byId;
  protected readonly categoriesList = this.categoriesService.list;
  /** Custom category open in the edit dialog (from the ⋯ in the filter dropdown). */
  protected readonly editingCategory = signal<string | null>(null);
  /** Streak / XP / goal state (live). */
  protected readonly game = inject(GamificationService);
  protected readonly streakOpen = signal(false);
  protected readonly nudgeDismissed = signal(false);
  protected stats = signal<NoteStats | null>(null);
  protected loading = signal(true);
  protected loadingMore = signal(false);
  protected allLoaded = signal(false);
  protected totalCount = signal(0);
  protected error = '';

  /** id of the note open in the reading pane ('new' while composing), or null. */
  protected readonly selectedId = signal<string | null>(this.idFromUrl(this.router.url));
  protected readonly noteOpen = computed(() => this.selectedId() !== null);

  private currentFilters?: NoteFilters;
  private loadMoreEpoch = 0;
  private sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  // ---------- Hide-on-scroll list header ----------
  /** true while scrolling down through the notes; scrolling up (or reaching the top) reveals it. */
  protected readonly headerHidden = signal(false);
  private lastScrollY = 0;

  /** Desktop: the notes column scrolls on its own. */
  protected onListScroll(y: number): void {
    this.updateHeader(y);
  }

  /** Mobile: the page itself scrolls. */
  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      this.updateHeader(window.scrollY);
    }
  }

  private updateHeader(y: number): void {
    const delta = y - this.lastScrollY;
    if (y < 80) this.headerHidden.set(false); // near the top: always visible
    else if (delta > 8) this.headerHidden.set(true); // scrolling down
    else if (delta < -8) this.headerHidden.set(false); // scrolling up
    if (Math.abs(delta) > 8 || y < 80) this.lastScrollY = y;
  }
  protected readonly skeletons = [0, 1, 2, 3, 4, 5];

  protected greeting = this.getGreeting();
  protected readonly year = new Date().getFullYear();
  protected readonly footerLinks = [
    { path: 'support', label: 'Support' },
    { path: 'privacy', label: 'Privacy' },
    { path: 'terms', label: 'Terms' },
  ];

  protected readonly confidenceLevels: { value: ConfidenceLevel; label: string; dot: string; color: string }[] = [
    { value: 'need_practice', label: 'Need practice', dot: 'bg-confidence-need-practice', color: 'var(--confidence-need-practice)' },
    { value: 'getting_there', label: 'Getting there', dot: 'bg-confidence-getting-there', color: 'var(--confidence-getting-there)' },
    { value: 'confident', label: 'Confident', dot: 'bg-confidence-confident', color: 'var(--confidence-confident)' },
  ];

  protected readonly categoryOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All categories', icon: 'folder' },
    ...this.categoriesList().map((c) => ({
      value: c.id,
      label: c.name,
      icon: c.icon,
      color: c.color,
      editable: !this.categoriesService.isDefault(c),
      locked: this.categoriesService.isDefault(c),
    })),
  ]);

  protected readonly heading = computed(() =>
    this.filterState.smartFilter() === 'bookmarks' ? 'Saved notes' : 'Your notes',
  );

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.selectedId.set(this.idFromUrl(e.urlAfterRedirects)));

    toObservable(this.filterState.filters)
      .pipe(
        debounceTime(300),
        switchMap((filters) => {
          this.loadMoreEpoch++;
          this.currentFilters = filters;
          this.loading.set(true);
          this.loadingMore.set(false);
          this.allLoaded.set(false);
          this.displayedNotes.set([]);
          return this.notesService.getAll(filters, 1, this.PAGE_SIZE);
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (result) => {
          this.error = '';
          this.displayedNotes.set(result.data);
          this.totalCount.set(result.count);
          this.allLoaded.set(result.count <= this.PAGE_SIZE);
          this.loading.set(false);
        },
        error: (err) => {
          this.error = err.message;
          this.loading.set(false);
        },
      });

    // Keep the list in sync with edits made in the reading pane (autosave, delete, bookmark).
    this.notesService.changes$.pipe(takeUntilDestroyed()).subscribe((change) => {
      if (change.type === 'delete') {
        this.displayedNotes.update((ns) => ns.filter((n) => n.id !== change.id));
        this.totalCount.update((c) => Math.max(0, c - 1));
        return;
      }
      const note = change.note;
      this.displayedNotes.update((ns) => {
        if (ns.some((n) => n.id === note.id)) {
          return ns.map((n) => (n.id === note.id ? note : n));
        }
        this.totalCount.update((c) => c + 1);
        return [note, ...ns];
      });
    });
  }

  /** Infinite scroll: load the next page when the sentinel below the list nears view. */
  private readonly infiniteScroll = effect((onCleanup) => {
    const el = this.sentinel()?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) this.loadMore();
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    onCleanup(() => io.disconnect());
  });

  ngOnInit(): void {
    this.categoriesService.seedDefaults().subscribe();

    this.notesService.getStats().subscribe({
      next: (s) => this.stats.set(s),
    });
  }

  protected toggleConfidence(level: ConfidenceLevel): void {
    const on = this.filterState.confidenceLevel() === level;
    this.filterState.setConfidenceLevel(on ? null : level);
  }

  /** "+ Create" in the filter dropdown: make the category and filter by it. */
  protected createCategory(name: string): void {
    this.categoriesService.create(name).subscribe({
      next: (cat) => this.filterState.setCategoryId(cat.id),
      error: (err: Error) => alert(err.message),
    });
  }

  /** A category was deleted: its notes now live in `movedTo`. */
  protected onCategoryDeleted(e: { id: string; movedTo: string }): void {
    this.displayedNotes.update((ns) => ns.map((n) => (n.category_id === e.id ? { ...n, category_id: e.movedTo } : n)));
    if (this.filterState.categoryId() === e.id) this.filterState.setCategoryId(null);
  }

  protected getCategory(note: Note): Category | null {
    return this.categories().get(note.category_id) ?? null;
  }

  protected toggleFavorite(note: Note): void {
    // List patches itself via NotesService.changes$.
    this.notesService.update(note.id, { is_favorite: !note.is_favorite }).subscribe();
  }

  protected loadMore(): void {
    if (this.loadingMore() || this.allLoaded() || this.loading()) return;

    this.loadingMore.set(true);
    const epoch = ++this.loadMoreEpoch;
    const nextPage = Math.floor(this.displayedNotes().length / this.PAGE_SIZE) + 1;

    this.notesService.getAll(this.currentFilters, nextPage, this.PAGE_SIZE).subscribe({
      next: (result) => {
        if (epoch !== this.loadMoreEpoch) return;
        this.displayedNotes.update((ns) => {
          const seen = new Set(ns.map((n) => n.id));
          return [...ns, ...result.data.filter((n) => !seen.has(n.id))];
        });
        this.allLoaded.set(this.displayedNotes().length >= result.count);
        this.loadingMore.set(false);
      },
      error: () => {
        if (epoch === this.loadMoreEpoch) this.loadingMore.set(false);
      },
    });
  }

  private idFromUrl(url: string): string | null {
    const m = /^\/notes\/([^/?#]+)/.exec(url);
    return m ? decodeURIComponent(m[1]) : null;
  }

  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }
}
