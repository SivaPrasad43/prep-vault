import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCopy, lucideCheck, lucideGlobe, lucideRotateCw, lucideLink2Off } from '@ng-icons/lucide';
import { ZardButtonComponent } from '@/shared/ui/button';
import { Modal } from '../modal/modal';
import { NotesService } from '../../../core/services/notes.service';

/**
 * Public read-only link for a note: create, copy, reset (old link stops working)
 * or stop sharing. Anyone with the link can view the latest version, signed out.
 */
@Component({
  selector: 'app-share-dialog',
  imports: [NgIcon, ZardButtonComponent, Modal],
  viewProviders: [provideIcons({ lucideCopy, lucideCheck, lucideGlobe, lucideRotateCw, lucideLink2Off })],
  template: `
    <app-modal [open]="open()" title="Share note" (close)="closed.emit()">
      @if (!token()) {
        <div class="flex items-start gap-3">
          <span class="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <ng-icon name="lucideGlobe" />
          </span>
          <p>
            Create a <span class="font-medium text-foreground">read-only link</span> anyone can open without signing in.
            They'll always see the latest version. Nobody can edit it.
          </p>
        </div>
      } @else {
        <p>Anyone with this link can view this note. It always shows the latest version.</p>
        <div class="mt-3 flex items-center gap-2 rounded-lg border bg-muted/50 p-1 pl-3">
          <input
            #linkInput
            class="h-8 min-w-0 flex-1 truncate bg-transparent font-mono text-xs text-foreground outline-none"
            [value]="url()"
            readonly
            aria-label="Public link"
            (focus)="linkInput.select()"
          />
          <button z-button zSize="sm" class="shrink-0" (click)="copy()">
            <ng-icon [name]="copied() ? 'lucideCheck' : 'lucideCopy'" />
            {{ copied() ? 'Copied' : 'Copy' }}
          </button>
        </div>

        @if (confirmReset()) {
          <div class="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
            <p class="text-foreground">Reset the link? The current link will stop working for everyone who has it.</p>
            <div class="mt-2 flex justify-end gap-2">
              <button z-button zType="ghost" zSize="sm" (click)="confirmReset.set(false)">Cancel</button>
              <button z-button zSize="sm" class="bg-destructive text-white hover:bg-destructive/90" [zLoading]="busy()" (click)="reset()">Reset link</button>
            </div>
          </div>
        }
      }

      @if (error()) {
        <p class="mt-3 text-xs text-destructive" role="alert">{{ error() }}</p>
      }

      <ng-container modal-actions>
        @if (!token()) {
          <button z-button zType="ghost" (click)="closed.emit()">Cancel</button>
          <button z-button [zLoading]="busy()" (click)="enable()">
            <ng-icon name="lucideGlobe" /> Create public link
          </button>
        } @else {
          <button z-button zType="ghost" class="mr-auto text-destructive hover:bg-destructive/10" [zDisabled]="busy()" (click)="disable()">
            <ng-icon name="lucideLink2Off" /> Stop sharing
          </button>
          <button z-button zType="outline" [zDisabled]="busy() || confirmReset()" (click)="confirmReset.set(true)">
            <ng-icon name="lucideRotateCw" /> Reset link
          </button>
          <button z-button (click)="closed.emit()">Done</button>
        }
      </ng-container>
    </app-modal>
  `,
})
export class ShareDialog {
  private notes = inject(NotesService);

  readonly open = input(false);
  readonly noteId = input<string | null>(null);
  /** Current share token of the note (null = not shared). */
  readonly token = input<string | null>(null);
  readonly closed = output<void>();
  /** New token after enable/reset/disable (null when sharing stopped). */
  readonly tokenChange = output<string | null>();

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly copied = signal(false);
  protected readonly confirmReset = signal(false);
  protected readonly url = computed(() => (this.token() ? this.notes.shareUrl(this.token()!) : ''));

  constructor() {
    effect(() => {
      this.open();
      untracked(() => {
        this.error.set('');
        this.copied.set(false);
        this.confirmReset.set(false);
      });
    });
  }

  protected enable(): void {
    this.run(this.notes.enableShare(this.noteId()!), true);
  }

  protected reset(): void {
    this.run(this.notes.enableShare(this.noteId()!), true);
  }

  protected disable(): void {
    this.run(this.notes.disableShare(this.noteId()!), false);
  }

  private run(req: ReturnType<NotesService['enableShare']>, copyAfter: boolean): void {
    if (!this.noteId() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    req.subscribe({
      next: (note) => {
        this.busy.set(false);
        this.confirmReset.set(false);
        this.tokenChange.emit(note.share_token ?? null);
        if (copyAfter && note.share_token) this.copyText(this.notes.shareUrl(note.share_token));
      },
      error: (err: { code?: string; message?: string }) => {
        this.busy.set(false);
        // 42703 / PGRST204: column missing → migration not run yet.
        this.error.set(
          err?.code === '42703' || err?.code === 'PGRST204'
            ? 'Sharing isn’t set up yet. Run migrations/001_note_sharing.sql in Supabase.'
            : 'Couldn’t update the link. Please try again.',
        );
      },
    });
  }

  protected copy(): void {
    this.copyText(this.url());
  }

  private copyText(text: string): void {
    navigator.clipboard?.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    });
  }
}
