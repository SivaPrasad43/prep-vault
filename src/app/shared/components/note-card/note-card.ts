import { Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBookmark } from '@ng-icons/lucide';
import { ConfidenceIndicator } from '../confidence-indicator/confidence-indicator';
import { CategoryIcon } from '../category-icon/category-icon';
import type { Note, Category } from '../../../core/models';

const BOOKMARK_SOLID =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>';

/** Strip common markdown syntax for a plain-text card preview. */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, '') // inline HTML such as <mark data-color="…"> highlights
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
  imports: [DatePipe, RouterLink, NgIcon, ConfidenceIndicator, CategoryIcon],
  templateUrl: './note-card.html',
  viewProviders: [provideIcons({ lucideBookmark, heroBookmarkSolid: BOOKMARK_SOLID })],
})
export class NoteCard {
  readonly note = input.required<Note>();
  readonly category = input<Category | null>(null);
  /** Currently open in the reading pane. */
  readonly active = input(false);
  readonly toggleFavorite = output<Note>();

  protected readonly preview = computed(() => {
    const n = this.note();
    const text = n.body_markdown ? toPlainText(n.body_markdown) : (n.description ?? '');
    return text.length > 200 ? text.slice(0, 200) + '…' : text;
  });

  protected readonly confidenceLabel = computed(
    () =>
      ({ need_practice: 'Need practice', getting_there: 'Getting there', confident: 'Confident' })[
        this.note().confidence_level
      ],
  );

  /** Compact date: time for today, "MMM d" this year, full date otherwise. */
  protected readonly dateFormat = computed(() => {
    const d = new Date(this.note().updated_at);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'h:mm a';
    return d.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, y';
  });
}
