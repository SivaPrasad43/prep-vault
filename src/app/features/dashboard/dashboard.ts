import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus } from '@lucide/angular';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap } from 'rxjs';
import { NotesService } from '../../core/services/notes.service';
import { CategoriesService } from '../../core/services/categories.service';
import { FilterStateService } from '../../core/services/filter-state.service';

import { NoteCard } from '../../shared/components/note-card/note-card';
import { SearchBar } from '../../shared/components/search-bar/search-bar';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import type { Note, Category, NoteStats } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, FormsModule, LucidePlus, NoteCard, SearchBar, EmptyState],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private filterState = inject(FilterStateService);
  protected notes = signal<Note[]>([]);
  protected categories = signal<Map<string, Category>>(new Map());
  protected stats = signal<NoteStats | null>(null);
  protected loading = signal(true);
  protected error = '';

  protected greeting = this.getGreeting();
  protected today = new Date();

  constructor() {
    toObservable(this.filterState.filters)
      .pipe(
        debounceTime(300),
        switchMap((filters) => {
          this.loading.set(true);
          return this.notesService.getAll(filters);
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (data) => {
          this.notes.set(data);
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

  protected getCategory(note: Note): Category | null {
    return this.categories().get(note.category_id) ?? null;
  }

  protected toggleFavorite(note: Note): void {
    this.notesService.update(note.id, { is_favorite: !note.is_favorite }).subscribe({
      next: (updated) => {
        this.notes.update((ns) => ns.map((n) => (n.id === updated.id ? updated : n)));
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
