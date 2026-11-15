import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideSun, lucideMoon, lucideLogOut, lucidePlus,
  lucideLibrary, lucideChartColumn, lucideBookmark,
} from '@ng-icons/lucide';

import { ZardAvatarComponent } from '@/shared/ui/avatar';
import { ZardTooltipImports } from '@/shared/ui/tooltip';
import { ZardDropdownImports } from '@/shared/ui/dropdown';
import { ThemeService } from '../core/services/theme.service';
import { AuthService } from '../core/services/auth.service';
import { FilterStateService } from '../core/services/filter-state.service';
import { GamificationService } from '../core/services/gamification.service';
import { CelebrationHost } from '../shared/components/celebration/celebration';

type NavKey = 'notes' | 'bookmarks' | 'analytics';

/**
 * App shell, "study desk" style: a slim icon rail on the left (desktop) or a
 * bottom tab bar (mobile). Search and filters live in the notes list itself.
 */
@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet, RouterLink, NgTemplateOutlet, NgIcon,
    ZardAvatarComponent, ...ZardTooltipImports, ...ZardDropdownImports, CelebrationHost,
  ],
  templateUrl: './layout.html',
  viewProviders: [
    provideIcons({
      lucideSun, lucideMoon, lucideLogOut, lucidePlus,
      lucideLibrary, lucideChartColumn, lucideBookmark,
    }),
  ],
})
export class Layout {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  protected themeService = inject(ThemeService);
  protected authService = inject(AuthService);
  protected filterState = inject(FilterStateService);

  protected readonly activePath = signal('/notes');
  /** A note is open (/notes/:id). Below lg the note takes the whole screen. */
  protected readonly noteOpen = computed(() => this.activePath().startsWith('/notes/'));

  protected readonly active = computed<NavKey>(() => {
    if (this.activePath() === '/analytics') return 'analytics';
    return this.filterState.smartFilter() === 'bookmarks' ? 'bookmarks' : 'notes';
  });

  protected readonly user = computed(() => {
    this.activePath(); // re-evaluate after navigation (auth user is not a signal)
    const u = this.authService.user;
    const name = u?.display_name || u?.email?.split('@')[0] || 'User';
    return {
      name,
      email: u?.email ?? '',
      avatar: u?.avatar_url ?? '',
      initial: name[0]?.toUpperCase() ?? '?',
    };
  });

  constructor() {
    // Load streak/XP state once the user is in the app.
    inject(GamificationService).init();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        const path = e.urlAfterRedirects.split('?')[0];
        this.activePath.set(path === '/' ? '/notes' : path);
      });
  }

  protected showNotes(): void {
    this.filterState.setSmartFilter(null);
    this.toNotes();
  }

  protected showBookmarks(): void {
    this.filterState.setSmartFilter('bookmarks');
    this.toNotes();
  }

  /** Filters apply to the list; an open note stays open on desktop. */
  private toNotes(): void {
    const inNotes = this.activePath() === '/notes' || this.noteOpen();
    if (!inNotes) this.router.navigate(['/notes']);
  }

  protected signOut(): void {
    this.authService.signOut().subscribe({
      next: () => this.router.navigate(['/auth']),
      error: () => this.router.navigate(['/auth']),
    });
  }
}
