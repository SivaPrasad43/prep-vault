import { Component, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMinus, lucidePlus, lucideTrophy, lucideX, lucideZap } from '@ng-icons/lucide';
import { GamificationService } from '../../../core/services/gamification.service';
import { StreakFlame } from '../streak-flame/streak-flame';

/** Streak details: week, daily goal ring, next milestone, level & XP. */
@Component({
  selector: 'app-streak-panel',
  imports: [RouterLink, NgIcon, StreakFlame],
  viewProviders: [provideIcons({ lucideMinus, lucidePlus, lucideTrophy, lucideX, lucideZap })],
  template: `
    <div class="relative">
      <button type="button" class="absolute -top-1 -right-1 grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Close" (click)="closed.emit()">
        <ng-icon name="lucideX" />
      </button>

      <!-- Streak -->
      <div class="flex items-center gap-4">
        <app-streak-flame [streak]="g.streak()" [lit]="g.todayDone()" [size]="64" />
        <div>
          <p class="text-3xl leading-none font-bold tabular-nums">{{ g.streak() }}<span class="ml-1 text-base font-medium text-muted-foreground">{{ g.streak() === 1 ? 'day' : 'days' }}</span></p>
          <p class="mt-1 text-xs text-muted-foreground">
            @if (g.todayDone()) {
              Today's done. Best: {{ g.best() }} days
            } @else if (g.streak() > 0) {
              Study today to keep it alive
            } @else {
              Write or revise a note to start
            }
          </p>
        </div>
      </div>

      @if (g.nextMilestone(); as m) {
        <div class="mt-4">
          <div class="flex justify-between text-xs text-muted-foreground">
            <span>Next milestone</span>
            <span><span class="font-semibold text-foreground">{{ m.remaining }}</span> {{ m.remaining === 1 ? 'day' : 'days' }} to {{ m.target }} 🔥</span>
          </div>
          <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300 transition-[width] duration-700" [style.width.%]="((g.streak() - m.prev) / (m.target - m.prev)) * 100"></div>
          </div>
        </div>
      }

      <!-- Week -->
      <p class="mt-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">This week</p>
      <div class="mt-2 grid grid-cols-7 gap-1.5">
        @for (d of g.week(); track d.key) {
          <div class="flex flex-col items-center gap-1">
            <span
              class="grid size-9 place-items-center rounded-full border text-sm transition-colors"
              [class]="d.count ? 'border-transparent bg-orange-500/12' : d.isToday ? 'week-today border-dashed border-orange-400' : 'border-transparent bg-muted/60'"
              [class.opacity-40]="d.isFuture"
              [title]="d.count + ' study actions'"
            >
              @if (d.count) {
                <app-streak-flame [streak]="g.streak()" [lit]="true" [size]="20" />
              }
            </span>
            <span class="text-[0.65rem] text-muted-foreground" [class.font-bold]="d.isToday" [class.text-foreground]="d.isToday">{{ d.label }}</span>
          </div>
        }
      </div>

      <!-- Goal -->
      <div class="mt-5 flex items-center gap-4 rounded-2xl bg-muted/50 p-3">
        <div class="relative grid size-16 shrink-0 place-items-center">
          <svg class="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3.5" class="stroke-muted" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3.5" stroke-linecap="round"
              class="goal-ring stroke-[#4cc35b] transition-[stroke-dashoffset] duration-700 ease-out"
              stroke-dasharray="97.4" [attr.stroke-dashoffset]="97.4 - (97.4 * g.goalPct()) / 100" />
          </svg>
          <span class="text-sm font-bold tabular-nums">{{ g.todayCount() }}/{{ g.goal() }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">{{ g.goalMet() ? 'Daily goal met 🎯' : 'Daily goal' }}</p>
          <p class="text-xs text-muted-foreground">Notes written or revised today</p>
        </div>
        <div class="flex items-center gap-1" role="group" aria-label="Daily goal">
          <button type="button" class="grid size-7 place-items-center rounded-full border bg-background hover:bg-muted disabled:opacity-40" [disabled]="g.goal() <= 1" (click)="g.setGoal(g.goal() - 1)" aria-label="Lower daily goal"><ng-icon name="lucideMinus" class="text-xs" /></button>
          <span class="w-5 text-center text-sm font-semibold tabular-nums" aria-live="polite">{{ g.goal() }}</span>
          <button type="button" class="grid size-7 place-items-center rounded-full border bg-background hover:bg-muted disabled:opacity-40" [disabled]="g.goal() >= 10" (click)="g.setGoal(g.goal() + 1)" aria-label="Raise daily goal"><ng-icon name="lucidePlus" class="text-xs" /></button>
        </div>
      </div>

      <!-- Level -->
      @let lv = g.level();
      <div class="mt-3 rounded-2xl bg-[#120a3d] p-3 text-white">
        <div class="flex items-center gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-[#68da23] text-sm font-bold text-[#120a3d]">{{ lv.level }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ lv.name }}</p>
            <p class="text-xs text-white/60">{{ lv.xp }} XP{{ lv.next ? ' · ' + (lv.next - lv.xp) + ' to ' + lv.nextName : '' }}</p>
          </div>
          <ng-icon name="lucideZap" class="text-[#68da23]" />
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div class="xp-bar h-full rounded-full bg-[#68da23] transition-[width] duration-700" [style.width.%]="lv.pct"></div>
        </div>
      </div>

      <a routerLink="/analytics" fragment="achievements" class="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-primary hover:bg-muted dark:text-[#68da23]" (click)="closed.emit()">
        <ng-icon name="lucideTrophy" />
        Achievements · {{ g.unlockedCount() }}/{{ g.achievements().length }}
      </a>
    </div>
  `,
})
export class StreakPanel {
  protected g = inject(GamificationService);
  readonly closed = output<void>();
}
