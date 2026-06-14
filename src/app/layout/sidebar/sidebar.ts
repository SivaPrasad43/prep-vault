import { Component, OnInit, inject, output, input, signal, ChangeDetectorRef } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideSun, LucideMoon, LucideX, LucideFilterX, LucideLogOut, LucideStar, LucidePin, LucideClock, LucidePencil, LucideLayoutDashboard, LucideDownload, LucideUpload } from '@lucide/angular';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { FilterStateService } from '../../core/services/filter-state.service';
import { CategoriesService } from '../../core/services/categories.service';
import { NotesService } from '../../core/services/notes.service';
import { CategoryIcon } from '../../shared/components/category-icon/category-icon';
import type { ConfidenceLevel, Category } from '../../core/models';

@Component({
  selector: 'app-sidebar',
  imports: [NgClass, CategoryIcon, LucideSun, LucideMoon, LucideX, LucideFilterX, LucideLogOut, LucideStar, LucidePin, LucideClock, LucidePencil, LucideLayoutDashboard, LucideDownload, LucideUpload],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  readonly isOpen = input<boolean>(false);
  readonly sidebarVisible = input<boolean>(true);
  readonly closeSidebar = output<void>();

  protected filterState = inject(FilterStateService);
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private router = inject(Router);

  protected categories: Category[] = [];
  protected activeRoute = signal('dashboard');

  protected readonly smartFilters = [
    { id: 'favorites' as const, label: 'Favorites' },
    { id: 'pinned' as const, label: 'Pinned' },
    { id: 'recently_added' as const, label: 'Recently Added' },
    { id: 'recently_edited' as const, label: 'Recently Edited' },
  ];

  protected readonly confidenceLevels: { value: ConfidenceLevel; label: string; color: string }[] = [
    { value: 'need_practice', label: 'Need Practice', color: 'var(--color-confidence-need-practice)' },
    { value: 'getting_there', label: 'Getting There', color: 'var(--color-confidence-getting-there)' },
    { value: 'confident', label: 'Confident', color: 'var(--color-confidence-confident)' },
  ];

  private cdr = inject(ChangeDetectorRef);

  constructor(
    protected themeService: ThemeService,
    protected authService: AuthService,
  ) {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const path = e.urlAfterRedirects.split('?')[0].replace(/^\//, '') || 'dashboard';
        this.activeRoute.set(path);
      });
  }

  ngOnInit(): void {
    this.categoriesService.seedDefaults().subscribe({
      next: (cats) => { this.categories = cats; this.cdr.markForCheck(); },
    });
  }

  protected selectCategory(id: string | null): void {
    const current = this.filterState.categoryId();
    this.filterState.setCategoryId(current === id ? null : id);
    this.onClose();
  }

  protected selectConfidence(level: ConfidenceLevel): void {
    const current = this.filterState.confidenceLevel();
    this.filterState.setConfidenceLevel(current === level ? null : level);
    this.onClose();
  }

  protected selectSmartFilter(filterId: string): void {
    const current = this.filterState.smartFilter();
    this.filterState.setSmartFilter(current === filterId ? null : filterId as never);
    this.onClose();
  }

  protected resetFilters(): void {
    this.filterState.resetFilters();
    this.onClose();
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

  protected exportNotes(): void {
    this.notesService.getAll().subscribe({
      next: (notes) => {
        const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prepvault-notes-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  protected importNotes(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const notes = JSON.parse(reader.result as string);
        if (!Array.isArray(notes)) throw new Error('Invalid format');
        let imported = 0;
        for (const n of notes) {
          this.notesService.create({
            title: n.title ?? '',
            description: n.description ?? '',
            category_id: n.category_id ?? '',
            confidence_level: n.confidence_level ?? 'need_practice',
            code_snippets: n.code_snippets ?? [],
            links: n.links ?? [],
            is_favorite: n.is_favorite ?? false,
            is_pinned: n.is_pinned ?? false,
          }).subscribe({ next: () => imported++ });
        }
      } catch {
        // ignore invalid file
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
}
