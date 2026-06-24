import { Component, input, output, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { LucideBookmark } from '@lucide/angular';
import { CategoryBadge } from '../category-badge/category-badge';
import { ConfidenceIndicator } from '../confidence-indicator/confidence-indicator';
import type { Note, Category } from '../../../core/models';

@Component({
  selector: 'app-note-card',
  imports: [DatePipe, LucideBookmark, CategoryBadge, ConfidenceIndicator],
  templateUrl: './note-card.html',
  styleUrl: './note-card.scss',
})
export class NoteCard {
  private router = inject(Router);

  readonly note = input.required<Note>();
  readonly category = input<Category | null>(null);
  readonly toggleFavorite = output<Note>();

  protected openNote(): void {
    this.router.navigate(['/notes', this.note().id]);
  }
}
