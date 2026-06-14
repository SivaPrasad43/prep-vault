import { Component, input } from '@angular/core';
import { CategoryIcon } from '../category-icon/category-icon';
import type { Category } from '../../../core/models';

@Component({
  selector: 'app-category-badge',
  imports: [CategoryIcon],
  templateUrl: './category-badge.html',
  styleUrl: './category-badge.scss',
})
export class CategoryBadge {
  readonly category = input.required<Category>();
}
