import { Component, computed, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBookmark } from '@ng-icons/lucide';
import { CategoryBadge } from '../category-badge/category-badge';
import { ConfidenceIndicator } from '../confidence-indicator/confidence-indicator';
import type { Note, Category } from '../../../core/models';

const BOOKMARK_SOLID =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>';

/** Strip common markdown syntax for a plain-text card preview. */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s*-\s\[[ x]\]\s+/gim, '')
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

@Component({
  selector: 'app-note-card',
  imports: [DatePipe, RouterLink, NgIcon, CategoryBadge, ConfidenceIndicator],
  templateUrl: './note-card.html',
  viewProviders: [provideIcons({ lucideBookmark, heroBookmarkSolid: BOOKMARK_SOLID })],
})
export class NoteCard {
  private router = inject(Router);

  readonly note = input.required<Note>();
  readonly category = input<Category | null>(null);
  readonly toggleFavorite = output<Note>();

  protected readonly preview = computed(() => {
    const n = this.note();
    const text = n.body_markdown ? toPlainText(n.body_markdown) : (n.description ?? '');
    return text.length > 400 ? text.slice(0, 400) + '…' : text;
  });

  protected openNote(): void {
    this.router.navigate(['/notes', this.note().id]);
  }
}
