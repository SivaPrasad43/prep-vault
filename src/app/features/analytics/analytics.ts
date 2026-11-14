import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideFlame, lucideHistory, lucideNotebookPen, lucideTarget, lucideTrendingUp, lucideTrendingDown,
  lucideChevronRight, lucideCircleCheck, lucideRotateCw,
} from '@ng-icons/lucide';
import { ZardSkeletonComponent } from '@/shared/ui/skeleton';
import { ProgressService, type ProgressData } from '../../core/services/progress.service';
import { CategoriesService } from '../../core/services/categories.service';
import { FilterStateService } from '../../core/services/filter-state.service';
import { CategoryIcon } from '../../shared/components/category-icon/category-icon';
import {
  addDays, bestStreak, confidenceByCategory, countBetween, currentStreak, heatmap, reviewNext,
  startOfDay, studyDays, trend,
} from '../../shared/study-stats';
import type { Category, ConfidenceLevel } from '../../core/models';

type Range = 7 | 30 | 90;

const CONFIDENCE_META: { value: ConfidenceLevel; label: string; color: string }[] = [
  { value: 'need_practice', label: 'Need practice', color: 'var(--confidence-need-practice)' },
  { value: 'getting_there', label: 'Getting there', color: 'var(--confidence-getting-there)' },
  { value: 'confident', label: 'Confident', color: 'var(--confidence-confident)' },
];

/** Progress page: what to study next, how consistent you are, and where you're weak. */
@Component({
  selector: 'app-analytics',
  imports: [NgTemplateOutlet, RouterLink, NgIcon, ZardSkeletonComponent, CategoryIcon],
  templateUrl: './analytics.html',
  viewProviders: [
    provideIcons({
      lucideFlame, lucideHistory, lucideNotebookPen, lucideTarget, lucideTrendingUp, lucideTrendingDown,
      lucideChevronRight, lucideCircleCheck, lucideRotateCw,
    }),
  ],
})
export class Analytics {
  private progress = inject(ProgressService);
  private categoriesService = inject(CategoriesService);
  private filterState = inject(FilterStateService);
  private router = inject(Router);

  protected readonly ranges: Range[] = [7, 30, 90];
  protected readonly range = signal<Range>(30);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly data = signal<ProgressData>({ notes: [], revisions: [] });
  protected readonly categories = signal<Map<string, Category>>(new Map());
  protected readonly confidence = CONFIDENCE_META;
  protected readonly weekdays = ['Mon', '', 'Wed', '', 'Fri', '', ''];

  private readonly createdAt = computed(() => this.data().notes.map((n) => n.created_at));
  private readonly revisedAt = computed(() => this.data().revisions.map((r) => r.revised_at));
  private readonly days = computed(() => studyDays(this.createdAt(), this.revisedAt()));

  protected readonly summary = computed(() => {
    const r = this.range();
    const end = addDays(startOfDay(), 1);
    const start = addDays(end, -r);
    const prevStart = addDays(start, -r);
    const revisions = countBetween(this.revisedAt(), start, end);
    const written = countBetween(this.createdAt(), start, end);
    const notes = this.data().notes;
    const total = notes.length;
    const count = (l: ConfidenceLevel) => notes.filter((n) => n.confidence_level === l).length;
    return {
      streak: currentStreak(this.days()),
      best: bestStreak(this.days()),
      revisions,
      revisionsTrend: trend(revisions, countBetween(this.revisedAt(), prevStart, start)),
      written,
      writtenTrend: trend(written, countBetween(this.createdAt(), prevStart, start)),
      total,
      confidentPct: total ? Math.round((count('confident') / total) * 100) : 0,
      split: CONFIDENCE_META.map((c) => ({ ...c, count: count(c.value), pct: total ? (count(c.value) / total) * 100 : 0 })),
    };
  });

  protected readonly heat = computed(() => heatmap(this.createdAt(), this.revisedAt(), this.range()));
  /** 7d view: just the last 7 days in order (no padding cells). */
  protected readonly lastWeek = computed(() => this.heat().flat().filter((c) => c.level !== -1));
  protected readonly review = computed(() => reviewNext(this.data().notes, this.data().revisions, 5));
  protected readonly byCategory = computed(() =>
    confidenceByCategory(this.data().notes).map((row) => ({
      ...row,
      category: this.categories().get(row.categoryId) ?? null,
      segments: CONFIDENCE_META.map((c) => ({ ...c, count: row[c.value], pct: (row[c.value] / row.total) * 100 })),
    })),
  );

  constructor() {
    this.load();
    this.categoriesService.seedDefaults().subscribe({
      next: (cats) => this.categories.set(new Map(cats.map((c) => [c.id, c]))),
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.progress.load().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  protected categoryFor(id: string): Category | null {
    return this.categories().get(id) ?? null;
  }

  protected heatLabel(c: { date: Date; notes: number; revisions: number }): string {
    const d = c.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${d}: ${c.notes} ${c.notes === 1 ? 'note' : 'notes'}, ${c.revisions} ${c.revisions === 1 ? 'revision' : 'revisions'}`;
  }

  protected revisedLabel(lastRevised: Date | null, daysSince: number): string {
    if (!lastRevised) return daysSince === 0 ? 'Never revised · added today' : `Never revised · added ${daysSince}d ago`;
    if (daysSince === 0) return 'Revised today';
    if (daysSince === 1) return 'Revised yesterday';
    return `Revised ${daysSince} days ago`;
  }

  /** Jump to the notes list with the given filters (others cleared). */
  protected openNotes(filters: { categoryId?: string | null; confidence?: ConfidenceLevel | null }): void {
    this.filterState.setSearchQuery('');
    this.filterState.setSmartFilter(null);
    this.filterState.setCategoryId(filters.categoryId ?? null);
    this.filterState.setConfidenceLevel(filters.confidence ?? null);
    this.router.navigate(['/notes']);
  }
}
