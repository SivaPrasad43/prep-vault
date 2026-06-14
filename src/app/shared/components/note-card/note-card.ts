import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideStar, LucideCode, LucideLink, LucidePin, LucideEye, LucidePencil, LucideTrash2 } from '@lucide/angular';
import { CategoryBadge } from '../category-badge/category-badge';
import { ConfidenceIndicator } from '../confidence-indicator/confidence-indicator';
import type { Note, Category } from '../../../core/models';

@Component({
  selector: 'app-note-card',
  imports: [DatePipe, RouterLink, LucideStar, LucideCode, LucideLink, LucidePin, LucideEye, LucidePencil, LucideTrash2, CategoryBadge, ConfidenceIndicator],
  templateUrl: './note-card.html',
  styleUrl: './note-card.scss',
})
export class NoteCard {
  readonly note = input.required<Note>();
  readonly category = input<Category | null>(null);
  readonly toggleFavorite = output<Note>();
  readonly deleteNote = output<Note>();

  protected hasCode = (n: Note): boolean => n.code_snippets && n.code_snippets.length > 0;
  protected hasLinks = (n: Note): boolean => n.links && n.links.length > 0;
}
