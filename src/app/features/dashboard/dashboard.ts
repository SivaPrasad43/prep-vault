import { Component, OnInit, inject, signal, ElementRef, viewChild, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideFlame, lucidePencilLine } from '@ng-icons/lucide';
import { ZardButtonComponent } from '@/shared/ui/button';
import { ZardSkeletonComponent } from '@/shared/ui/skeleton';
import { DatePipe } from '@angular/common';
import { CategoryIcon } from '../../shared/components/category-icon/category-icon';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap } from 'rxjs';
import { NotesService } from '../../core/services/notes.service';
import { CategoriesService } from '../../core/services/categories.service';
import { FilterStateService } from '../../core/services/filter-state.service';

import { NoteCard } from '../../shared/components/note-card/note-card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import type { Note, Category, NoteStats, NoteFilters } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, NgIcon, ZardButtonComponent, ZardSkeletonComponent, NoteCard, EmptyState, CategoryIcon],
  templateUrl: './dashboard.html',
  viewProviders: [provideIcons({ lucidePlus, lucideFlame, lucidePencilLine })],
})
export class Dashboard implements OnInit {
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  protected filterState = inject(FilterStateService);
  private readonly PAGE_SIZE = 10;

  protected displayedNotes = signal<Note[]>([]);
  protected categories = signal<Map<string, Category>>(new Map());
  protected categoriesList = signal<Category[]>([]);
  protected stats = signal<NoteStats | null>(null);
  protected loading = signal(true);
  protected loadingMore = signal(false);
  protected allLoaded = signal(false);
  protected error = '';

  private currentFilters?: NoteFilters;
  private loadMoreEpoch = 0;
  private sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  protected readonly skeletons = [0, 1, 2, 3, 4, 5];

  protected greeting = this.getGreeting();
  protected today = new Date();

  constructor() {
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
          this.allLoaded.set(result.count <= this.PAGE_SIZE);
          this.loading.set(false);
        },
        error: (err) => {
          this.error = err.message;
          this.loading.set(false);
        },
      });
  }

  /** Infinite scroll: load the next page when the sentinel below the grid nears the viewport. */
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
    this.categoriesService.seedDefaults().subscribe({
      next: (cats) => {
        setTimeout(() => {
          const map = new Map<string, Category>();
          cats.forEach((c) => map.set(c.id, c));
          this.categories.set(map);
          this.categoriesList.set(cats);
        });
      },
    });

    this.notesService.getStats().subscribe({
      next: (s) => setTimeout(() => this.stats.set(s)),
    });
  }

  protected selectCategory(id: string | null): void {
    const current = this.filterState.categoryId();
    this.filterState.setCategoryId(current === id ? null : id);
  }

  protected getCategory(note: Note): Category | null {
    return this.categories().get(note.category_id) ?? null;
  }

  protected toggleFavorite(note: Note): void {
    this.notesService.update(note.id, { is_favorite: !note.is_favorite }).subscribe({
      next: (updated) => {
        this.displayedNotes.update((ns) => ns.map((n) => (n.id === updated.id ? updated : n)));
      },
    });
  }

  protected loadMore(): void {
    if (this.loadingMore() || this.allLoaded() || this.loading()) return;

    this.loadingMore.set(true);
    const epoch = ++this.loadMoreEpoch;
    const nextPage = Math.floor(this.displayedNotes().length / this.PAGE_SIZE) + 1;

    this.notesService.getAll(this.currentFilters, nextPage, this.PAGE_SIZE).subscribe({
      next: (result) => {
        if (epoch !== this.loadMoreEpoch) return;
        this.displayedNotes.update((ns) => [...ns, ...result.data]);
        this.allLoaded.set(this.displayedNotes().length >= result.count);
        this.loadingMore.set(false);
      },
      error: () => {
        if (epoch === this.loadMoreEpoch) this.loadingMore.set(false);
      },
    });
  }

  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }
}
