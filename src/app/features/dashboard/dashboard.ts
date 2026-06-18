import { Component, OnInit, AfterViewInit, inject, signal, ViewChild, ElementRef, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideFlame } from '@lucide/angular';
import { CategoryIcon } from '../../shared/components/category-icon/category-icon';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, fromEvent } from 'rxjs';
import { NotesService } from '../../core/services/notes.service';
import { CategoriesService } from '../../core/services/categories.service';
import { FilterStateService } from '../../core/services/filter-state.service';

import { NoteCard } from '../../shared/components/note-card/note-card';
import { SearchBar } from '../../shared/components/search-bar/search-bar';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { SkeletonCard } from '../../shared/components/skeleton-card/skeleton-card';
import type { Note, Category, NoteStats, NoteFilters } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, FormsModule, LucidePlus, LucideFlame, NoteCard, SearchBar, EmptyState, CategoryIcon, SkeletonCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, AfterViewInit {
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private hostRef = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
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
  private scrollContainer: HTMLElement | null = null;

  @ViewChild('categoriesContainer') categoriesContainer?: ElementRef<HTMLElement>;

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

  protected onSearch(query: string): void {
    this.filterState.setSearchQuery(query);
  }

  protected selectCategory(id: string | null): void {
    const current = this.filterState.categoryId();
    this.filterState.setCategoryId(current === id ? null : id);

    setTimeout(() => {
      const container = this.categoriesContainer?.nativeElement;
      if (!container) return;
      const active = container.querySelector('.dashboard__cat-tab.--active') as HTMLElement | null;
      if (active) {
        active.scrollIntoView({ inline: 'start', behavior: 'smooth', block: 'nearest' });
      }
    });
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

  ngAfterViewInit(): void {
    let el: HTMLElement | null = this.hostRef.nativeElement;
    while (el) {
      const style = getComputedStyle(el);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') break;
      el = el.parentElement;
    }

    if (el) {
      this.scrollContainer = el;
      fromEvent(el, 'scroll')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (this.loadingMore() || this.allLoaded() || this.loading()) return;
          const { scrollTop, scrollHeight, clientHeight } = this.scrollContainer!;
          if (scrollTop + clientHeight >= scrollHeight - 400) {
            this.loadMore();
          }
        });
    }
  }

  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }
}
