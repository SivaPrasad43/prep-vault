import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideLock, lucideBookOpenText } from '@ng-icons/lucide';
import { ZardButtonComponent } from '@/shared/ui/button';
import { BlockEditor } from '../../../shared/components/block-editor/block-editor';
import { GUIDE_MARKDOWN, GUIDE_TITLE } from './guide-content';

/**
 * Built-in "How to use PrepDay" guide. Same paper page as a note, but read-only:
 * no editing, saving, category/confidence/revision controls, bookmark or delete.
 */
@Component({
  selector: 'app-guide-page',
  imports: [NgIcon, ZardButtonComponent, BlockEditor],
  viewProviders: [provideIcons({ lucideArrowLeft, lucideLock, lucideBookOpenText })],
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
        <h1 class="font-serif text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{{ title }}</h1>

        <div class="mt-3 mb-6 flex flex-wrap items-center gap-2 border-b border-dashed pb-4 text-sm text-muted-foreground">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <ng-icon name="lucideBookOpenText" />
            Guide
          </span>
          <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
            <ng-icon name="lucideLock" />
            Read-only · built into PrepDay
          </span>
        </div>

        <app-block-editor [value]="body" [editable]="false" />
      </article>
    </div>
  `,
})
export class GuidePage {
  private router = inject(Router);
  protected readonly title = GUIDE_TITLE;
  protected readonly body = GUIDE_MARKDOWN;

  protected goBack(): void {
    this.router.navigate(['/notes']);
  }
}
