import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GamificationService, type Celebration } from '../../../core/services/gamification.service';
import { confetti } from '../../confetti';

interface ToastItem {
  id: number;
  emoji: string;
  title: string;
  text?: string;
}

interface ModalItem {
  emoji: string;
  eyebrow: string;
  title: string;
  text: string;
}

/**
 * App-wide celebration host: animated toasts (streak extended, goal met) and a
 * confetti modal for streak milestones, level-ups and achievement unlocks (queued).
 */
@Component({
  selector: 'app-celebration',
  template: `
    <!-- Toasts -->
    <div class="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
      @for (t of toasts(); track t.id) {
        <div class="toast-in pointer-events-auto flex items-center gap-3 rounded-2xl border bg-popover px-4 py-3 text-sm shadow-sheet">
          <span class="flame-pop text-2xl" aria-hidden="true">{{ t.emoji }}</span>
          <div>
            <p class="font-semibold">{{ t.title }}</p>
            @if (t.text) {
              <p class="text-xs text-muted-foreground">{{ t.text }}</p>
            }
          </div>
        </div>
      }
    </div>

    <!-- Milestone / level / badge modal -->
    @if (modal(); as m) {
      <div class="fixed inset-0 z-[95] grid place-items-center bg-black/50 p-4 animate-in fade-in-0" (click)="dismiss()">
        <div
          class="celebrate-in relative w-full max-w-sm overflow-hidden rounded-3xl bg-popover p-8 text-center shadow-2xl"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="m.title"
          (click)="$event.stopPropagation()"
        >
          <div class="pointer-events-none absolute inset-x-0 -top-24 mx-auto size-56 rounded-full bg-[#68da23]/25 blur-3xl" aria-hidden="true"></div>
          <div class="badge-shine relative mx-auto grid size-24 place-items-center rounded-full bg-[#120a3d] text-5xl shadow-[0_0_0_6px_rgb(104_218_35/0.35)]">
            <span class="flame-pop">{{ m.emoji }}</span>
          </div>
          <p class="relative mt-5 text-xs font-semibold tracking-widest text-[#4cc35b] uppercase">{{ m.eyebrow }}</p>
          <h2 class="relative mt-1 font-serif text-2xl font-semibold">{{ m.title }}</h2>
          <p class="relative mt-2 text-sm text-muted-foreground">{{ m.text }}</p>
          <button
            type="button"
            class="relative mt-6 inline-flex h-10 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90"
            (click)="dismiss()"
            autofocus
          >
            Nice!
          </button>
        </div>
      </div>
    }
  `,
})
export class CelebrationHost {
  private game = inject(GamificationService);
  protected readonly toasts = signal<ToastItem[]>([]);
  protected readonly modal = signal<ModalItem | null>(null);
  private queue: ModalItem[] = [];
  private nextId = 1;

  constructor() {
    this.game.celebrations$.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((c) => this.handle(c));
  }

  private handle(c: Celebration): void {
    switch (c.kind) {
      case 'toast': {
        const id = this.nextId++;
        this.toasts.update((t) => [...t, { id, emoji: c.emoji, title: c.title, text: c.text }]);
        setTimeout(() => this.toasts.update((t) => t.filter((x) => x.id !== id)), 3600);
        return;
      }
      case 'milestone':
        return this.enqueue({
          emoji: '🔥',
          eyebrow: 'Streak milestone',
          title: `${c.streak}-day streak!`,
          text: `You've studied ${c.streak} days in a row. That's how offers are won.`,
        });
      case 'level':
        return this.enqueue({
          emoji: '⬆️',
          eyebrow: `Level ${c.level.level}`,
          title: c.level.name,
          text: c.level.nextName ? `Next up: ${c.level.nextName} at ${c.level.next} XP.` : 'Max level. You are a legend.',
        });
      case 'achievement':
        return this.enqueue({
          emoji: c.achievement.emoji,
          eyebrow: 'Achievement unlocked',
          title: c.achievement.title,
          text: c.achievement.description,
        });
    }
  }

  private enqueue(item: ModalItem): void {
    if (this.modal()) {
      this.queue.push(item);
      return;
    }
    this.show(item);
  }

  private show(item: ModalItem): void {
    this.modal.set(item);
    confetti();
  }

  protected dismiss(): void {
    const next = this.queue.shift();
    this.modal.set(null);
    if (next) setTimeout(() => this.show(next), 250);
  }
}
