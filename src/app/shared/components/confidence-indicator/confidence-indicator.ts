import { Component, computed, input } from '@angular/core';
import type { ConfidenceLevel } from '../../../core/models';

const LEVELS: Record<ConfidenceLevel, { label: string; step: number; bg: string }> = {
  need_practice: { label: 'Need practice', step: 1, bg: 'bg-confidence-need-practice' },
  getting_there: { label: 'Getting there', step: 2, bg: 'bg-confidence-getting-there' },
  confident: { label: 'Confident', step: 3, bg: 'bg-confidence-confident' },
};

/**
 * Confidence level as a label with a dot (`variant="label"`, default) or as a
 * compact 3-segment meter (`variant="meter"`).
 */
@Component({
  selector: 'app-confidence-indicator',
  template: `
    @if (variant() === 'meter') {
      <span class="inline-flex items-center gap-0.5" role="img" [attr.aria-label]="'Confidence: ' + info().label" [title]="info().label">
        @for (i of [1, 2, 3]; track i) {
          <span class="h-1.5 w-3 rounded-full" [class]="i <= info().step ? info().bg : 'bg-muted-foreground/20'"></span>
        }
      </span>
    } @else {
      <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span class="size-2 rounded-full" [class]="info().bg"></span>
        {{ info().label }}
      </span>
    }
  `,
  host: { class: 'inline-flex' },
})
export class ConfidenceIndicator {
  readonly level = input.required<ConfidenceLevel>();
  readonly variant = input<'label' | 'meter'>('label');
  protected readonly info = computed(() => LEVELS[this.level()]);
}
