import { Component, input } from '@angular/core';
import type { ConfidenceLevel } from '../../../core/models';

@Component({
  selector: 'app-confidence-indicator',
  imports: [],
  templateUrl: './confidence-indicator.html',
  styleUrl: './confidence-indicator.scss',
})
export class ConfidenceIndicator {
  readonly level = input.required<ConfidenceLevel>();

  protected labels: Record<ConfidenceLevel, string> = {
    need_practice: 'Need Practice',
    getting_there: 'Getting There',
    confident: 'Confident',
  };
}
