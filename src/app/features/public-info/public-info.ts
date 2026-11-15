import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/** Signed-out frame for Support / Privacy / Terms (linked from the landing page). */
@Component({
  selector: 'app-public-info',
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="flex min-h-dvh flex-col bg-desk">
      <header class="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div class="mx-auto flex h-14 max-w-[54rem] items-center justify-between px-4">
          <a routerLink="/" aria-label="PrepDay home">
            <img src="assets/logo/logo-horizontal-on-light.svg" alt="PrepDay" class="h-7 w-auto dark:hidden" />
            <img src="assets/logo/logo-horizontal-on-dark.svg" alt="PrepDay" class="hidden h-7 w-auto dark:block" />
          </a>
          <a routerLink="/auth" class="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
            Start free
          </a>
        </div>
      </header>
      <main class="flex-1 sm:px-4"><router-outlet /></main>
      <footer class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-6 text-xs text-muted-foreground">
        <a routerLink="/support" class="hover:text-foreground">Support</a>
        <a routerLink="/privacy" class="hover:text-foreground">Privacy</a>
        <a routerLink="/terms" class="hover:text-foreground">Terms</a>
        <span>© {{ year }} PrepDay</span>
      </footer>
    </div>
  `,
})
export class PublicInfo {
  protected readonly year = new Date().getFullYear();
}
