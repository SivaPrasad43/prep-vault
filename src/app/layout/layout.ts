import { Component, signal, inject, DestroyRef } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Sidebar } from './sidebar/sidebar';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Sidebar],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  protected readonly sidebarOpen = signal(false);
  protected readonly showSidebar = signal(true);

  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        const show = e.urlAfterRedirects === '/dashboard' || e.urlAfterRedirects === '/' || e.urlAfterRedirects === '/analytics';
        this.showSidebar.set(show);
        if (!show) {
          this.sidebarOpen.set(false);
        }
      });
  }

  protected onToggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected onCloseSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
