import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { LucideFileText, LucideCalendar, LucideFlame } from '@lucide/angular';
import { Chart, registerables } from 'chart.js';
import { combineLatest } from 'rxjs';
import { NotesService } from '../../core/services/notes.service';
import { CategoriesService } from '../../core/services/categories.service';
import { AnalyticsSkeleton } from './analytics-skeleton';
import type { NoteStats } from '../../core/models';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  imports: [LucideFileText, LucideCalendar, LucideFlame, AnalyticsSkeleton],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics implements OnInit, OnDestroy {
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private barChart: Chart | null = null;
  private doughnutChart: Chart | null = null;

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

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '79, 110, 247';
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

    const style = getComputedStyle(document.documentElement);
    const primaryHex = style.getPropertyValue('--color-primary').trim() || '#4f6ef7';
    const primaryRgb = this.hexToRgb(primaryHex);
    const textMuted = style.getPropertyValue('--color-text-muted').trim() || '#94a3b8';
    const border = style.getPropertyValue('--color-border-light').trim() || '#f1f5f9';

    this.barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Notes',
          data: values,
          backgroundColor: `rgba(${primaryRgb}, 0.75)`,
          borderColor: `rgb(${primaryRgb})`,
          borderWidth: 1.5,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: style.getPropertyValue('--color-surface').trim() || '#fff',
            titleColor: style.getPropertyValue('--color-text').trim() || '#1e293b',
            bodyColor: style.getPropertyValue('--color-text-secondary').trim() || '#64748b',
            borderColor: style.getPropertyValue('--color-border').trim() || '#e2e8f0',
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
    const style = getComputedStyle(document.documentElement);

    const needPracticeColor = style.getPropertyValue('--color-confidence-need-practice').trim() || '#f87171';
    const gettingThereColor = style.getPropertyValue('--color-confidence-getting-there').trim() || '#fbbf24';
    const confidentColor = style.getPropertyValue('--color-confidence-confident').trim() || '#34d399';

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
              color: style.getPropertyValue('--color-text-secondary').trim() || '#64748b',
              font: { size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: style.getPropertyValue('--color-surface').trim() || '#fff',
            titleColor: style.getPropertyValue('--color-text').trim() || '#1e293b',
            bodyColor: style.getPropertyValue('--color-text-secondary').trim() || '#64748b',
            borderColor: style.getPropertyValue('--color-border').trim() || '#e2e8f0',
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
