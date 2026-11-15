import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLink2Off, lucideArrowRight } from '@ng-icons/lucide';
import { ZardSkeletonComponent } from '@/shared/ui/skeleton';
import { BlockEditor } from '../../shared/components/block-editor/block-editor';
import { NotesService } from '../../core/services/notes.service';
import type { SharedNote } from '../../core/models';

/**
 * Public, read-only view of a shared note at /s/:token. Works signed out; reads the
 * note through the get_shared_note() database function (latest version, no editing).
 */
@Component({
  selector: 'app-public-note',
  imports: [RouterLink, NgIcon, ZardSkeletonComponent, BlockEditor],
  viewProviders: [provideIcons({ lucideLink2Off, lucideArrowRight })],
  template: `
    <div class="flex min-h-dvh flex-col bg-desk">
      <!-- Brand header -->
      <header class="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div class="mx-auto flex h-14 max-w-[54rem] items-center justify-between gap-3 px-4">
          <a routerLink="/" aria-label="PrepDay home" class="shrink-0">
            <img src="assets/logo/logo-horizontal-on-light.svg" alt="PrepDay" class="h-7 w-auto dark:hidden" />
            <img src="assets/logo/logo-horizontal-on-dark.svg" alt="PrepDay" class="hidden h-7 w-auto dark:block" />
          </a>
          <a
            routerLink="/"
            class="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
          >
            Make your own notes
            <ng-icon name="lucideArrowRight" />
          </a>
        </div>
      </header>

      <main class="flex-1 px-0 py-0 sm:px-4 sm:py-6">
        <div class="mx-auto min-h-[60vh] max-w-[54rem] bg-page sm:rounded-md sm:shadow-page">
          @if (loading()) {
            <div class="space-y-4 px-5 py-10 sm:px-14">
              <z-skeleton class="h-10 w-3/5" />
              <z-skeleton class="h-4 w-48" />
              <z-skeleton class="mt-8 h-4 w-full" />
              <z-skeleton class="h-4 w-11/12" />
              <z-skeleton class="h-4 w-3/4" />
            </div>
          } @else if (note(); as n) {
            <article class="px-5 pt-8 pb-16 sm:px-14 sm:pt-12">
              <h1 class="font-serif text-3xl leading-tight font-semibold tracking-tight break-words sm:text-4xl">
                {{ n.title || 'Untitled' }}
              </h1>
              <div class="mt-3 mb-6 border-b border-dashed pb-4 text-sm text-muted-foreground">
                @if (n.author_name) {
                  By <span class="font-medium text-foreground">{{ n.author_name }}</span>
                }
              </div>
              <app-block-editor [value]="n.body_markdown ?? ''" [editable]="false" />
            </article>
          } @else {
            <div class="flex flex-col items-center gap-3 px-6 py-24 text-center">
              <span class="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
                <ng-icon name="lucideLink2Off" class="text-2xl" />
              </span>
              <h1 class="font-serif text-2xl font-semibold">This link isn't active</h1>
              <p class="max-w-sm text-sm text-muted-foreground">
                The owner may have stopped sharing this note or reset its link. Ask them for a new one.
              </p>
            </div>
          }
        </div>
      </main>

      <footer class="flex flex-col items-center gap-2 px-4 pt-8 pb-10 text-center text-xs text-muted-foreground">
        <span>Made with</span>
        <a routerLink="/" aria-label="PrepDay" class="transition-opacity hover:opacity-80">
          <img src="assets/logo/logo-horizontal-on-light.svg" alt="PrepDay" class="h-8 w-auto dark:hidden" />
          <img src="assets/logo/logo-horizontal-on-dark.svg" alt="PrepDay" class="hidden h-8 w-auto dark:block" />
        </a>
        <span>Interview prep, one day at a time.</span>
      </footer>
    </div>
  `,
})
export class PublicNote implements OnDestroy {
  private notes = inject(NotesService);
  private meta = inject(Meta);
  private titleService = inject(Title);

  protected readonly loading = signal(true);
  protected readonly note = signal<SharedNote | null>(null);

  constructor() {
    // Shared links are unlisted: keep them out of search engines.
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    inject(ActivatedRoute).paramMap.subscribe((params) => {
      const token = params.get('token') ?? '';
      this.loading.set(true);
      if (typeof window === 'undefined') return; // data loads in the browser
      this.notes.getSharedNote(token).subscribe({
        next: (n) => {
          this.note.set(n);
          this.loading.set(false);
          this.titleService.setTitle(n ? `${n.title || 'Untitled'} · PrepDay` : 'Link not active · PrepDay');
        },
        error: () => {
          this.note.set(null);
          this.loading.set(false);
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
    this.titleService.setTitle('PrepDay');
  }
}
