import { Component, computed, input } from '@angular/core';

let uid = 0;

/**
 * Animated SVG flame. Grey when today isn't done yet, orange when lit, and a hot
 * blue-white core once the streak reaches 30. Optional ring = daily-goal progress.
 */
@Component({
  selector: 'app-streak-flame',
  template: `
    <span class="relative inline-grid place-items-center" [style.width.px]="size()" [style.height.px]="size()">
      @if (ring() !== null) {
        <svg class="absolute inset-0 -rotate-90" [attr.viewBox]="'0 0 36 36'" aria-hidden="true">
          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="2.5" class="text-muted" />
          <circle
            cx="18" cy="18" r="16" fill="none" stroke-width="2.5" stroke-linecap="round"
            class="goal-ring transition-[stroke-dashoffset] duration-700 ease-out"
            [attr.stroke]="lit() ? '#ff8a00' : 'var(--muted-foreground)'"
            stroke-dasharray="100.53"
            [attr.stroke-dashoffset]="100.53 - (100.53 * ring()!) / 100"
          />
        </svg>
      }
      <svg
        [attr.viewBox]="'0 0 24 24'"
        [style.width.%]="ring() !== null ? 62 : 100"
        [style.height.%]="ring() !== null ? 62 : 100"
        [class.flame-flicker]="lit()"
        aria-hidden="true"
      >
        <defs>
          <linearGradient [attr.id]="gid + '-outer'" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" [attr.stop-color]="palette().outer[0]" />
            <stop offset="100%" [attr.stop-color]="palette().outer[1]" />
          </linearGradient>
          <linearGradient [attr.id]="gid + '-inner'" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" [attr.stop-color]="palette().inner[0]" />
            <stop offset="100%" [attr.stop-color]="palette().inner[1]" />
          </linearGradient>
        </defs>
        <path
          [attr.fill]="'url(#' + gid + '-outer)'"
          d="M12 2c.6 3.1 2.6 4.6 4.3 6.4C18.1 10.3 19.5 12.4 19.5 15A7.5 7.5 0 0 1 4.5 15c0-2.2.9-4 2.3-5.5.2 1.6 1 2.8 2.3 3.4C8.6 9.2 10 5.3 12 2Z"
        />
        <path
          class="flame-core"
          [attr.fill]="'url(#' + gid + '-inner)'"
          d="M12 10.5c.4 1.8 1.6 2.6 2.5 3.7.6.7 1 1.5 1 2.5a3.5 3.5 0 0 1-7 0c0-1.1.5-2 1.2-2.7.1.8.6 1.4 1.2 1.6-.3-1.9.3-3.6 1.1-5.1Z"
        />
      </svg>
    </span>
  `,
  host: { class: 'inline-flex' },
})
export class StreakFlame {
  readonly streak = input(0);
  /** Today has a study action (flame lit). */
  readonly lit = input(false);
  readonly size = input(28);
  /** 0–100 daily-goal progress ring; null = no ring. */
  readonly ring = input<number | null>(null);

  protected readonly gid = `flame-${uid++}`;

  protected readonly palette = computed(() => {
    if (!this.lit()) return { outer: ['#9ca3af', '#d1d5db'], inner: ['#e5e7eb', '#f3f4f6'] };
    if (this.streak() >= 30) return { outer: ['#2563eb', '#a5f3fc'], inner: ['#e0f2fe', '#ffffff'] };
    if (this.streak() >= 7) return { outer: ['#dc2626', '#fb923c'], inner: ['#fde047', '#fff7ed'] };
    return { outer: ['#ea580c', '#fdba74'], inner: ['#fde047', '#fffbeb'] };
  });
}
