import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideBookOpenText } from '@ng-icons/lucide';

/** Placeholder sheet when no note is open (desktop only; mobile shows the list). */
@Component({
  selector: 'app-note-empty',
  imports: [RouterLink, NgIcon],
  viewProviders: [provideIcons({ lucidePlus, lucideBookOpenText })],
  template: `
    <div class="mx-auto my-6 grid min-h-[calc(100dvh-3rem)] max-w-[54rem] place-items-center rounded-md border-2 border-dashed border-muted-foreground/20 p-8 text-center">
      <div class="flex max-w-xs flex-col items-center gap-3">
        <ng-icon name="lucideBookOpenText" class="text-4xl text-muted-foreground/60" />
        <h2 class="font-serif text-xl font-semibold">Pick a note to study</h2>
        <p class="text-sm text-muted-foreground">Choose one from your notes, or start writing something new.</p>
        <a
          routerLink="/notes/new"
          class="mt-2 inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
        >
          <ng-icon name="lucidePlus" />
          New note
        </a>
      </div>
    </div>
  `,
  host: { class: 'block h-full' },
})
export class NoteEmpty {}
