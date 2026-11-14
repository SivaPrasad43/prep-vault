import { Component, input } from '@angular/core';
import { CategoryIcon } from '../category-icon/category-icon';
import type { Category } from '../../../core/models';

@Component({
  selector: 'app-category-badge',
  imports: [CategoryIcon],
  template: `
    <span
      class="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      [style.color]="category().color"
      [style.background]="'color-mix(in oklab, ' + category().color + ' 14%, transparent)'"
    >
      <app-category-icon [icon]="category().icon" class="text-[0.85em]" />
      <span class="truncate">{{ category().name }}</span>
    </span>
  `,
})
export class CategoryBadge {
  readonly category = input.required<Category>();
}
