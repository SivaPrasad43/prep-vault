import { Component, input, output, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { LucideStar, LucideCode, LucideLink, LucidePin } from '@lucide/angular';
import { CategoryBadge } from '../category-badge/category-badge';
import { ConfidenceIndicator } from '../confidence-indicator/confidence-indicator';
import type { Note, Category } from '../../../core/models';

@Component({
  selector: 'app-note-card',
  imports: [DatePipe, LucideStar, LucideCode, LucideLink, LucidePin, CategoryBadge, ConfidenceIndicator],
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

  protected hasCode = (n: Note): boolean => n.code_snippets && n.code_snippets.length > 0;
  protected hasLinks = (n: Note): boolean => n.links && n.links.length > 0;
}
