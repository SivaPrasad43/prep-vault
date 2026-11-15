import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideLock, lucideBookOpenText, lucideLifeBuoy, lucideShieldCheck, lucideScrollText } from '@ng-icons/lucide';
import { ZardButtonComponent } from '@/shared/ui/button';
import { BlockEditor } from '../../../shared/components/block-editor/block-editor';
import { GUIDE_MARKDOWN, GUIDE_TITLE } from './guide-content';
import {
  PRIVACY_MARKDOWN, PRIVACY_TITLE, SUPPORT_MARKDOWN, SUPPORT_TITLE, TERMS_MARKDOWN, TERMS_TITLE,
} from './info-content';

export type InfoPageKind = 'guide' | 'support' | 'privacy' | 'terms';

const PAGES: Record<InfoPageKind, { title: string; body: string; badge: string; icon: string }> = {
  guide: { title: GUIDE_TITLE, body: GUIDE_MARKDOWN, badge: 'Guide', icon: 'lucideBookOpenText' },
  support: { title: SUPPORT_TITLE, body: SUPPORT_MARKDOWN, badge: 'Support', icon: 'lucideLifeBuoy' },
  privacy: { title: PRIVACY_TITLE, body: PRIVACY_MARKDOWN, badge: 'Privacy', icon: 'lucideShieldCheck' },
  terms: { title: TERMS_TITLE, body: TERMS_MARKDOWN, badge: 'Terms', icon: 'lucideScrollText' },
};

/**
 * Built-in read-only pages: the "How to use PrepDay" guide plus Support, Privacy and
 * Terms (route data `page`). Same paper page as a note, but nothing is editable.
 */
@Component({
  selector: 'app-guide-page',
  imports: [NgIcon, ZardButtonComponent, BlockEditor],
  viewProviders: [provideIcons({ lucideArrowLeft, lucideLock, lucideBookOpenText, lucideLifeBuoy, lucideShieldCheck, lucideScrollText })],
  template: `
    <div class="relative min-h-dvh bg-page lg:mx-auto lg:my-6 lg:min-h-[calc(100dvh-3rem)] lg:max-w-[54rem] lg:rounded-md lg:shadow-page">
      <header class="sticky top-0 z-30 flex h-14 items-center gap-2 bg-page/90 px-2 backdrop-blur supports-[backdrop-filter]:bg-page/75 sm:px-4 lg:rounded-t-md">
        <button z-button zType="ghost" class="gap-2 rounded-full" (click)="goBack()" title="Back to notes">
          <ng-icon name="lucideArrowLeft" class="text-lg" />
          <span class="lg:sr-only">Notes</span>
        </button>
        <span class="ml-auto flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
          <ng-icon name="lucideLock" />
          Read-only
        </span>
      </header>

      <article class="mx-auto w-full max-w-3xl px-5 pt-4 pb-16 sm:px-14 sm:pt-8">
        <h1 class="font-serif text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{{ page().title }}</h1>

        <div class="mt-3 mb-6 flex flex-wrap items-center gap-2 border-b border-dashed pb-4 text-sm text-muted-foreground">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <ng-icon [name]="page().icon" />
            {{ page().badge }}
          </span>
          <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
            <ng-icon name="lucideLock" />
            Read-only · built into PrepDay
          </span>
        </div>

        @for (key of [kind()]; track key) {
          <app-block-editor [value]="page().body" [editable]="false" />
        }
      </article>
    </div>
  `,
})
export class GuidePage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected readonly kind = toSignal(
    this.route.data.pipe(map((d) => (d['page'] as InfoPageKind | undefined) ?? 'guide')),
    { initialValue: 'guide' as InfoPageKind },
  );
  protected readonly page = computed(() => PAGES[this.kind()]);
  /** Where the back arrow goes: the notes list in-app, the landing page when public. */
  private readonly backTo = toSignal(
    this.route.data.pipe(map((d) => (d['backTo'] as string | undefined) ?? '/notes')),
    { initialValue: '/notes' },
  );

  protected goBack(): void {
    this.router.navigateByUrl(this.backTo());
  }
}
