import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideMenu, lucideSearch, lucideX, lucideSun, lucideMoon, lucideLogOut,
  lucideNotebookPen, lucideChartColumn, lucideBookmark, lucideFolder, lucideVault,
} from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/ui/button';
import { ZardAvatarComponent } from '@/shared/ui/avatar';
import { ZardTooltipImports } from '@/shared/ui/tooltip';
import { ZardDropdownImports } from '@/shared/ui/dropdown';
import { ThemeService } from '../core/services/theme.service';
import { AuthService } from '../core/services/auth.service';
import { FilterStateService } from '../core/services/filter-state.service';
import { CategoriesService } from '../core/services/categories.service';
import { CategoryIcon } from '../shared/components/category-icon/category-icon';
import type { Category, ConfidenceLevel } from '../core/models';

/** Routes that get the Keep-style top bar + nav rail. Note pages render full-screen. */
const SHELL_ROUTES = ['/', '/my-notes', '/analytics'];

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet, RouterLink, NgTemplateOutlet, NgIcon, CategoryIcon,
    ZardButtonComponent, ZardAvatarComponent, ...ZardTooltipImports, ...ZardDropdownImports,
  ],
  templateUrl: './layout.html',
  viewProviders: [
    provideIcons({
      lucideMenu, lucideSearch, lucideX, lucideSun, lucideMoon, lucideLogOut,
      lucideNotebookPen, lucideChartColumn, lucideBookmark, lucideFolder, lucideVault,
    }),
  ],
})
export class Layout {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private categoriesService = inject(CategoriesService);
  protected themeService = inject(ThemeService);
  protected authService = inject(AuthService);
  protected filterState = inject(FilterStateService);

  /** Desktop: rail expanded (labels) vs collapsed (icons). Mobile: drawer open. */
  protected readonly railExpanded = signal(true);
  protected readonly drawerOpen = signal(false);
  protected readonly showShell = signal(true);
  protected readonly activePath = signal('/my-notes');
  protected readonly categories = signal<Category[]>([]);

  protected readonly confidenceLevels: { value: ConfidenceLevel; label: string; dot: string }[] = [
    { value: 'need_practice', label: 'Need practice', dot: 'bg-confidence-need-practice' },
    { value: 'getting_there', label: 'Getting there', dot: 'bg-confidence-getting-there' },
    { value: 'confident', label: 'Confident', dot: 'bg-confidence-confident' },
  ];

  protected readonly railClasses = computed(() =>
    [
      'fixed inset-y-0 left-0 z-40 w-72 shrink-0 overflow-x-hidden overflow-y-auto bg-background pt-2 pb-6 shadow-xl',
      'transition-[transform,width] duration-200',
      'md:sticky md:top-16 md:z-10 md:h-[calc(100dvh-4rem)] md:translate-x-0 md:shadow-none',
      this.drawerOpen() ? 'translate-x-0' : '-translate-x-full',
      this.railExpanded() ? 'md:w-72' : 'md:w-[4.5rem]',
    ].join(' '),
  );

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
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        const path = e.urlAfterRedirects.split('?')[0];
        this.activePath.set(path === '/' ? '/my-notes' : path);
        this.showShell.set(SHELL_ROUTES.includes(path));
        this.drawerOpen.set(false);
      });

    this.categoriesService
      .seedDefaults()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (cats) => this.categories.set(cats) });
  }

  protected toggleNav(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      this.railExpanded.update((v) => !v);
    } else {
      this.drawerOpen.update((v) => !v);
    }
  }

  protected onSearch(value: string): void {
    this.filterState.setSearchQuery(value);
    if (this.activePath() !== '/my-notes') {
      this.router.navigate(['/my-notes']);
    }
  }

  protected showAllNotes(): void {
    this.filterState.setSmartFilter(null);
    this.filterState.setConfidenceLevel(null);
    this.filterState.setCategoryId(null);
    this.go('/my-notes');
  }

  protected toggleBookmarks(): void {
    const on = this.filterState.smartFilter() === 'bookmarks';
    this.filterState.setSmartFilter(on ? null : 'bookmarks');
    this.go('/my-notes');
  }

  protected toggleConfidence(level: ConfidenceLevel): void {
    const on = this.filterState.confidenceLevel() === level;
    this.filterState.setConfidenceLevel(on ? null : level);
    this.go('/my-notes');
  }

  protected toggleCategory(id: string): void {
    const on = this.filterState.categoryId() === id;
    this.filterState.setCategoryId(on ? null : id);
    this.go('/my-notes');
  }

  protected isAllNotesActive(): boolean {
    return (
      this.activePath() === '/my-notes' &&
      !this.filterState.smartFilter() &&
      !this.filterState.confidenceLevel() &&
      !this.filterState.categoryId()
    );
  }

  private go(path: string): void {
    this.drawerOpen.set(false);
    if (this.activePath() !== path) this.router.navigate([path]);
  }

  protected signOut(): void {
    this.authService.signOut().subscribe({
      next: () => this.router.navigate(['/auth']),
      error: () => this.router.navigate(['/auth']),
    });
  }
}
