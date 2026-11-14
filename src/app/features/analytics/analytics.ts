import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFileText, lucideCalendar, lucideFlame, lucideSun } from '@ng-icons/lucide';
import { ZardCardImports } from '@/shared/ui/card';
import { ZardSkeletonComponent } from '@/shared/ui/skeleton';
import { Chart, registerables } from 'chart.js';
import { combineLatest } from 'rxjs';
import { NotesService } from '../../core/services/notes.service';
import { CategoriesService } from '../../core/services/categories.service';
import { ThemeService } from '../../core/services/theme.service';
import type { NoteStats } from '../../core/models';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  imports: [NgIcon, ...ZardCardImports, ZardSkeletonComponent],
  templateUrl: './analytics.html',
  viewProviders: [provideIcons({ lucideFileText, lucideCalendar, lucideFlame, lucideSun })],
})
export class Analytics implements OnInit, OnDestroy {
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private themeService = inject(ThemeService);
  private barChart: Chart | null = null;
  private doughnutChart: Chart | null = null;

  constructor() {
    effect(() => {
      this.themeService.isDark();
      if (this.loading()) return;
      // Wait a frame so ThemeService has toggled the .dark class before reading tokens.
      requestAnimationFrame(() => {
        this.renderBarChart();
        this.renderDoughnutChart();
      });
    });
  }

  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutCanvas') doughnutCanvas!: ElementRef<HTMLCanvasElement>;

  protected loading = signal(true);
  protected stats = signal<NoteStats | null>(null);
  protected weekData = signal<{ date: string; count: number }[]>([]);
  protected todayCount = signal(0);
  protected weekTotal = signal(0);
  protected categoryDistribution = signal<{ categoryId: string; count: number; name: string; color: string }[]>([]);
  protected maxCategoryCount = signal(1);

  private pendingRequests = 3;

  ngOnInit(): void {
    this.notesService.getStats().subscribe((s) => {
      this.stats.set(s);
      this.checkLoaded();
    });

    this.notesService.getNotesCountByDate(7).subscribe({
      next: (data) => {
        this.weekData.set(data);
        this.todayCount.set(data[data.length - 1]?.count ?? 0);
        this.weekTotal.set(data.reduce((sum, d) => sum + d.count, 0));
        this.checkLoaded();
      },
    });

    combineLatest([
      this.categoriesService.getAll(),
      this.notesService.getCategoryDistribution(),
    ]).subscribe(([categories, distribution]) => {
      const catMap = new Map(categories.map((c) => [c.id, { name: c.name, color: c.color }]));
      const merged = distribution
        .map((d) => ({
          ...d,
          name: catMap.get(d.categoryId)?.name ?? 'Unknown',
          color: catMap.get(d.categoryId)?.color ?? '#6b7280',
        }))
        .sort((a, b) => b.count - a.count);
      this.categoryDistribution.set(merged);
      this.maxCategoryCount.set(merged.length ? Math.max(...merged.map((d) => d.count)) : 1);
      this.checkLoaded();
    });
  }

  private checkLoaded(): void {
    this.pendingRequests--;
    if (this.pendingRequests === 0) {
      this.loading.set(false);
      setTimeout(() => {
        this.renderBarChart();
        this.renderDoughnutChart();
      });
    }
  }

  protected categoryPercent(count: number): number {
    return (count / this.maxCategoryCount()) * 100;
  }

  /** Read a theme token (ZardUI CSS variable) from :root. */
  private token(name: string, fallback: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  /** Add alpha to a #rrggbb / oklch() / rgb() color string; canvas accepts all. */
  private withAlpha(color: string, alpha: number): string {
    if (/^#[0-9a-f]{6}$/i.test(color)) {
      return color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    }
    return /^(oklch|rgb|hsl)\(/.test(color) && !color.includes('/')
      ? color.replace(/\)\s*$/, ` / ${alpha})`)
      : color;
  }

  private chartTheme() {
    return {
      primary: this.token('--primary', '#1a73e8'),
      text: this.token('--foreground', '#1e293b'),
      muted: this.token('--muted-foreground', '#94a3b8'),
      border: this.token('--border', '#e2e8f0'),
      surface: this.token('--popover', '#fff'),
    };
  }

  private renderBarChart(): void {
    if (this.barChart) {
      this.barChart.destroy();
      this.barChart = null;
    }

    const canvas = this.barCanvas?.nativeElement;
    if (!canvas) return;

    const data = this.weekData();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels = data.map((d) => days[new Date(d.date).getDay()]);
    const values = data.map((d) => d.count);

    const t = this.chartTheme();
    const textMuted = t.muted;
    const border = t.border;

    this.barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Notes',
          data: values,
          backgroundColor: this.withAlpha(t.primary, 0.8),
          hoverBackgroundColor: t.primary,
          borderWidth: 0,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface,
            titleColor: t.text,
            bodyColor: t.muted,
            borderColor: t.border,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textMuted, font: { size: 12 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: border },
            ticks: {
              color: textMuted,
              font: { size: 12 },
              stepSize: 1,
            },
          },
        },
      },
    });
  }

  private renderDoughnutChart(): void {
    if (this.doughnutChart) {
      this.doughnutChart.destroy();
      this.doughnutChart = null;
    }

    const canvas = this.doughnutCanvas?.nativeElement;
    if (!canvas || !this.stats()) return;

    const s = this.stats()!;
    const t = this.chartTheme();

    const needPracticeColor = this.token('--confidence-need-practice', '#f87171');
    const gettingThereColor = this.token('--confidence-getting-there', '#fbbf24');
    const confidentColor = this.token('--confidence-confident', '#34d399');

    this.doughnutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Need Practice', 'Getting There', 'Confident'],
        datasets: [{
          data: [s.needPractice, s.gettingThere, s.confident],
          backgroundColor: [needPracticeColor, gettingThereColor, confidentColor],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: t.muted,
              font: { size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: t.surface,
            titleColor: t.text,
            bodyColor: t.muted,
            borderColor: t.border,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const value = ctx.parsed;
                const pct = total ? Math.round((value / total) * 100) : 0;
                return ` ${ctx.label}: ${value} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  ngOnDestroy(): void {
    this.barChart?.destroy();
    this.barChart = null;
    this.doughnutChart?.destroy();
    this.doughnutChart = null;
  }
}
