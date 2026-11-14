import { Component, input } from '@angular/core';
import type { ConfidenceLevel } from '../../../core/models';

@Component({
  selector: 'app-confidence-indicator',
  template: `
    <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span class="size-2 rounded-full" [class]="dots[level()]"></span>
      {{ labels[level()] }}
    </span>
  `,
})
export class ConfidenceIndicator {
  readonly level = input.required<ConfidenceLevel>();

  protected labels: Record<ConfidenceLevel, string> = {
    need_practice: 'Need practice',
    getting_there: 'Getting there',
    confident: 'Confident',
  };

  protected dots: Record<ConfidenceLevel, string> = {
    need_practice: 'bg-confidence-need-practice',
    getting_there: 'bg-confidence-getting-there',
    confident: 'bg-confidence-confident',
  };
}
