import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrash2, lucideArrowLeft } from '@ng-icons/lucide';
import { ZardButtonComponent } from '@/shared/ui/button';
import { Modal } from '../modal/modal';
import { AppSelect } from '../select/select';
import type { SelectOption } from '../select/select-option';
import { CategoryIcon, CATEGORY_ICON_KEYS } from '../category-icon/category-icon';
import { CategoriesService, CATEGORY_NAME_MAX } from '../../../core/services/categories.service';

/**
 * Edit a custom category: rename, pick an icon, or delete it after choosing
 * where its notes should move. Opened from the ⋯ on a category in any dropdown.
 */
@Component({
  selector: 'app-category-dialog',
  imports: [NgIcon, ZardButtonComponent, Modal, AppSelect, CategoryIcon],
  viewProviders: [provideIcons({ lucideTrash2, lucideArrowLeft })],
  template: `
    <app-modal [open]="!!category()" [title]="step() === 'edit' ? 'Edit category' : 'Delete category'" (close)="close()">
      @if (category(); as cat) {
        @if (step() === 'edit') {
          <label class="block text-xs font-medium text-foreground" for="cat-name">Name</label>
          <input
            id="cat-name"
            class="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            [attr.maxlength]="maxName"
            [value]="name()"
            (input)="name.set($any($event.target).value); error.set('')"
            (keydown.enter)="save()"
          />

          <p class="mt-4 text-xs font-medium text-foreground">Icon</p>
          <div class="mt-1.5 grid grid-cols-7 gap-1" role="radiogroup" aria-label="Category icon">
            @for (key of icons; track key) {
              <button
                type="button"
                role="radio"
                class="grid aspect-square place-items-center rounded-lg border text-2xl transition-colors hover:bg-muted"
                [class]="icon() === key ? 'border-transparent ring-2 ring-primary' : 'border-transparent'"
                [style.color]="'color-mix(in oklab, ' + cat.color + ' var(--cat-strength), var(--foreground))'"
                [attr.aria-checked]="icon() === key"
                [attr.aria-label]="key"
                (click)="icon.set(key)"
              >
                <app-category-icon [icon]="key" />
              </button>
            }
          </div>

          @if (error()) {
            <p class="mt-3 text-xs text-destructive" role="alert">{{ error() }}</p>
          }
        } @else {
          @if (noteCount() === null) {
            <p>Checking notes in “{{ cat.name }}”…</p>
          } @else if (noteCount() === 0) {
            <p>“{{ cat.name }}” has no notes. It will be deleted.</p>
          } @else {
            <p>
              “{{ cat.name }}” has <span class="font-semibold text-foreground">{{ noteCount() }} {{ noteCount() === 1 ? 'note' : 'notes' }}</span>.
              Move {{ noteCount() === 1 ? 'it' : 'them' }} to:
            </p>
            <app-select
              class="mt-2 w-full"
              ariaLabel="Move notes to"
              placeholder="Choose a category"
              [options]="moveOptions()"
              [value]="moveTo()"
              (valueChange)="moveTo.set($event)"
            />
          }
          @if (error()) {
            <p class="mt-3 text-xs text-destructive" role="alert">{{ error() }}</p>
          }
        }
      }

      <ng-container modal-actions>
        @if (step() === 'edit') {
          <button z-button zType="ghost" class="mr-auto text-destructive hover:bg-destructive/10" (click)="startDelete()">
            <ng-icon name="lucideTrash2" /> Delete
          </button>
          <button z-button zType="ghost" (click)="close()">Cancel</button>
          <button z-button (click)="save()" [zLoading]="busy()" [zDisabled]="!name().trim()">Save</button>
        } @else {
          <button z-button zType="ghost" class="mr-auto" (click)="step.set('edit'); error.set('')">
            <ng-icon name="lucideArrowLeft" /> Back
          </button>
          <button
            z-button
            class="bg-destructive text-white hover:bg-destructive/90"
            (click)="confirmDelete()"
            [zLoading]="busy()"
            [zDisabled]="noteCount() === null || (noteCount()! > 0 && !moveTo())"
          >
            Delete{{ noteCount() ? ' & move notes' : '' }}
          </button>
        }
      </ng-container>
    </app-modal>
  `,
})
export class CategoryDialog {
  private categories = inject(CategoriesService);

  /** Category being edited; null = closed. */
  readonly categoryId = input<string | null>(null);
  readonly closed = output<void>();
  /** Emitted after deletion with the category the notes moved to. */
  readonly deleted = output<{ id: string; movedTo: string }>();

  protected readonly maxName = CATEGORY_NAME_MAX;
  protected readonly icons = CATEGORY_ICON_KEYS;
  protected readonly step = signal<'edit' | 'delete'>('edit');
  protected readonly name = signal('');
  protected readonly icon = signal('folder');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly noteCount = signal<number | null>(null);
  protected readonly moveTo = signal<string | null>(null);

  protected readonly category = computed(() => {
    const id = this.categoryId();
    return id ? (this.categories.byId().get(id) ?? null) : null;
  });

  protected readonly moveOptions = computed<SelectOption[]>(() =>
    this.categories
      .list()
      .filter((c) => c.id !== this.categoryId())
      .map((c) => ({ value: c.id, label: c.name, icon: c.icon, color: c.color })),
  );

  constructor() {
    // Reset the form whenever a different category is opened.
    effect(() => {
      const cat = this.category();
      untracked(() => {
        this.step.set('edit');
        this.error.set('');
        this.busy.set(false);
        this.noteCount.set(null);
        this.moveTo.set(null);
        this.name.set(cat?.name ?? '');
        this.icon.set(cat?.icon ?? 'folder');
      });
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected save(): void {
    const cat = this.category();
    if (!cat || this.busy()) return;
    this.busy.set(true);
    this.categories.update(cat.id, { name: this.name(), icon: this.icon() }).subscribe({
      next: () => {
        this.busy.set(false);
        this.close();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message);
      },
    });
  }

  protected startDelete(): void {
    const cat = this.category();
    if (!cat) return;
    this.step.set('delete');
    this.error.set('');
    this.noteCount.set(null);
    this.moveTo.set(this.moveOptions()[0]?.value ?? null);
    this.categories.noteCount(cat.id).subscribe({
      next: (n) => this.noteCount.set(n),
      error: () => this.error.set('Couldn’t count notes in this category. Try again.'),
    });
  }

  protected confirmDelete(): void {
    const cat = this.category();
    const target = this.moveTo() ?? this.moveOptions()[0]?.value;
    if (!cat || !target || this.busy()) return;
    this.busy.set(true);
    this.categories.remove(cat.id, target).subscribe({
      next: () => {
        this.busy.set(false);
        this.deleted.emit({ id: cat.id, movedTo: target });
        this.close();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message);
      },
    });
  }
}
