import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  imports: [],
  template: `<div class="skeleton" [style.width]="width()" [style.height]="height()" [style.border-radius]="borderRadius()"></div>`,
  styles: `
    .skeleton {
      background: linear-gradient(90deg, var(--color-border-light) 25%, var(--color-surface-hover) 50%, var(--color-border-light) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `,
})
export class Skeleton {
  readonly width = input<string>('100%');
  readonly height = input<string>('1rem');
  readonly borderRadius = input<string>('var(--radius-sm)');
}
