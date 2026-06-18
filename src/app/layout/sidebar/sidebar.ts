import { Component, inject, output, input, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideSun, LucideMoon, LucideX, LucideLogOut, LucideStar, LucidePin, LucideLayoutDashboard, LucideChartNoAxesColumn } from '@lucide/angular';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { FilterStateService } from '../../core/services/filter-state.service';
import type { ConfidenceLevel } from '../../core/models';

@Component({
  selector: 'app-sidebar',
  imports: [NgClass, LucideSun, LucideMoon, LucideX, LucideLogOut, LucideStar, LucidePin, LucideLayoutDashboard, LucideChartNoAxesColumn],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly isOpen = input<boolean>(false);
  readonly sidebarVisible = input<boolean>(true);
  readonly closeSidebar = output<void>();

  protected filterState = inject(FilterStateService);
  private router = inject(Router);

  protected activeRoute = signal('my-notes');

  protected readonly smartFilters = [
    { id: 'favorites' as const, label: 'Favorites' },
    { id: 'pinned' as const, label: 'Pinned' },
  ];

  protected readonly confidenceLevels: { value: ConfidenceLevel; label: string; color: string }[] = [
    { value: 'need_practice', label: 'Need Practice', color: 'var(--color-confidence-need-practice)' },
    { value: 'getting_there', label: 'Getting There', color: 'var(--color-confidence-getting-there)' },
    { value: 'confident', label: 'Confident', color: 'var(--color-confidence-confident)' },
  ];

  constructor(
    protected themeService: ThemeService,
    protected authService: AuthService,
  ) {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const path = e.urlAfterRedirects.split('?')[0].replace(/^\//, '') || 'my-notes';
        this.activeRoute.set(path);
      });
  }

  protected selectConfidence(level: ConfidenceLevel): void {
    const current = this.filterState.confidenceLevel();
    this.filterState.setConfidenceLevel(current === level ? null : level);
  }

  protected selectSmartFilter(filterId: string): void {
    const current = this.filterState.smartFilter();
    this.filterState.setSmartFilter(current === filterId ? null : filterId as never);
  }

  protected navigateTo(path: string): void {
    this.router.navigate([path]);
    this.onClose();
  }

  protected onClose(): void {
    this.closeSidebar.emit();
  }

  protected handleSignOut(): void {
    this.authService.signOut().subscribe({
      next: () => this.router.navigate(['/auth']),
      error: () => this.router.navigate(['/auth']),
    });
  }

  protected getUserName(): string {
    const u = this.authService.user;
    if (!u) return 'User';
    return u.display_name || u.email?.split('@')[0] || 'User';
  }

  protected getUserEmail(): string {
    return this.authService.user?.email || '';
  }

  protected getUserInitial(): string {
    const u = this.authService.user;
    if (!u) return '?';
    return (u.display_name?.[0] || u.email?.[0] || '?').toUpperCase();
  }
}
