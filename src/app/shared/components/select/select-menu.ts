import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideSearch, lucidePlus, lucideEllipsis, lucideLock } from '@ng-icons/lucide';
import { CategoryIcon } from '../category-icon/category-icon';
import type { SelectOption } from './select-option';

let nextId = 0;

/**
 * The option list of a dropdown: optional search box, keyboard navigation
 * (↑ ↓ Home End Enter Esc, type-to-search), check mark on the selected option.
 * Used inside `app-select`'s overlay and by the editor's code-language picker.
 */
@Component({
  selector: 'app-select-menu',
  imports: [NgIcon, CategoryIcon],
  viewProviders: [provideIcons({ lucideCheck, lucideSearch, lucidePlus, lucideEllipsis, lucideLock })],
  host: {
    // Width comes from the `width` input and is always capped to the viewport,
    // so the menu can never stretch across the page whatever its container is.
    class:
      'flex max-h-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-sheet',
    '[style.width]': 'width()',
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    @if (searchable()) {
      <div class="flex items-center gap-2 border-b px-3">
        <ng-icon name="lucideSearch" class="shrink-0 text-muted-foreground" />
        <input
          #search
          type="text"
          class="h-10 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          [placeholder]="searchPlaceholder()"
          [value]="query()"
          (input)="onQuery($any($event.target).value)"
          role="combobox"
          aria-autocomplete="list"
          [attr.aria-controls]="listId"
          [attr.aria-activedescendant]="activeId()"
          aria-expanded="true"
        />
      </div>
    }
    <ul
      #list
      class="scrollbar-thin overflow-y-auto p-1 outline-none"
      role="listbox"
      [id]="listId"
      [attr.aria-label]="label()"
      [attr.aria-activedescendant]="searchable() ? null : activeId()"
      [tabindex]="searchable() ? -1 : 0"
    >
      @for (opt of filtered(); track opt.value; let i = $index) {
        <li
          role="option"
          [id]="listId + '-' + i"
          [attr.aria-selected]="opt.value === value()"
          class="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm select-none"
          [class.bg-muted]="i === active()"
          (mouseenter)="active.set(i)"
          (mousedown)="$event.preventDefault()"
          (click)="pick(opt)"
        >
          @if (opt.dot) {
            <span class="size-2.5 shrink-0 rounded-full" [style.background]="opt.color"></span>
          } @else if (opt.icon) {
            <app-category-icon [icon]="opt.icon" class="shrink-0 text-base" [style.color]="opt.color ? 'color-mix(in oklab, ' + opt.color + ' var(--cat-strength), var(--foreground))' : null" />
          }
          <span class="min-w-0 flex-1 truncate">{{ opt.label }}</span>
          @if (opt.hint) {
            <span class="shrink-0 text-xs text-muted-foreground">{{ opt.hint }}</span>
          }
          @if (opt.editable) {
            <button
              type="button"
              class="grid size-6 shrink-0 place-items-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-background hover:text-foreground focus-visible:opacity-100"
              [class.opacity-100]="i === active()"
              [attr.aria-label]="'Edit ' + opt.label"
              title="Rename, change icon or delete"
              (mousedown)="$event.preventDefault()"
              (click)="$event.stopPropagation(); edit.emit(opt.value)"
            >
              <ng-icon name="lucideEllipsis" />
            </button>
          } @else if (opt.locked) {
            <ng-icon name="lucideLock" class="shrink-0 text-xs text-muted-foreground/50" title="Built-in category" />
          }
          <ng-icon
            name="lucideCheck"
            class="shrink-0 text-primary"
            [class.invisible]="opt.value !== value()"
          />
        </li>
      } @empty {
        @if (!showCreate()) {
          <li class="px-2.5 py-6 text-center text-sm text-muted-foreground">No matches</li>
        }
      }
      @if (showCreate()) {
        <li
          role="option"
          [id]="listId + '-' + filtered().length"
          [attr.aria-selected]="false"
          class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm select-none"
          [class.bg-muted]="active() === filtered().length"
          (mouseenter)="active.set(filtered().length)"
          (mousedown)="$event.preventDefault()"
          (click)="createNew()"
        >
          <span class="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <ng-icon name="lucidePlus" class="text-xs" />
          </span>
          <span class="min-w-0 flex-1 truncate">{{ createLabel() }} “<span class="font-semibold">{{ query().trim() }}</span>”</span>
        </li>
      }
    </ul>
  `,
})
export class SelectMenu {
  readonly options = input.required<SelectOption[]>();
  readonly value = input<string | null>(null);
  readonly searchable = input(false);
  readonly searchPlaceholder = input('Search…');
  readonly label = input('Options');
  /** CSS width of the menu (default 15rem). app-select passes 100% of its overlay pane. */
  readonly width = input('15rem');

  /** Offer "+ Create “query”" when the typed text doesn't match an existing option. */
  readonly creatable = input(false);
  readonly createLabel = input('Create');

  readonly picked = output<string>();
  readonly closed = output<void>();
  /** User chose to create a new option with this (trimmed) name. */
  readonly create = output<string>();
  /** User clicked ⋯ on an editable option. */
  readonly edit = output<string>();

  protected readonly listId = `app-select-menu-${nextId++}`;
  protected readonly query = signal('');
  protected readonly active = signal(0);

  private readonly searchRef = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly listRef = viewChild.required<ElementRef<HTMLUListElement>>('list');

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const opts = this.options();
    return q ? opts.filter((o) => o.label.toLowerCase().includes(q)) : opts;
  });

  protected readonly showCreate = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.creatable() && !!q && !this.options().some((o) => o.label.toLowerCase() === q);
  });

  /** Rows navigable with the keyboard: options, plus the create row when shown. */
  private readonly rowCount = computed(() => this.filtered().length + (this.showCreate() ? 1 : 0));

  protected readonly activeId = computed(() =>
    this.rowCount() ? `${this.listId}-${this.active()}` : null,
  );

  protected createNew(): void {
    const name = this.query().trim();
    if (name) this.create.emit(name);
  }

  constructor() {
    afterNextRender(() => {
      const idx = this.filtered().findIndex((o) => o.value === this.value());
      this.active.set(Math.max(0, idx));
      (this.searchRef()?.nativeElement ?? this.listRef().nativeElement).focus();
      this.scrollActiveIntoView();
    });
  }

  protected onQuery(q: string): void {
    this.query.set(q);
    this.active.set(0);
  }

  protected pick(opt: SelectOption): void {
    this.picked.emit(opt.value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.rowCount();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (count) this.active.update((i) => (i + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.active.update((i) => (i - 1 + count) % count);
        break;
      case 'Home':
        if (!this.searchable()) {
          event.preventDefault();
          this.active.set(0);
        }
        break;
      case 'End':
        if (!this.searchable()) {
          event.preventDefault();
          this.active.set(Math.max(0, count - 1));
        }
        break;
      case 'Enter': {
        event.preventDefault();
        const opt = this.filtered()[this.active()];
        if (opt) this.pick(opt);
        else if (this.showCreate()) this.createNew();
        break;
      }
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.closed.emit();
        break;
      case 'Tab':
        this.closed.emit();
        break;
      default:
        return;
    }
    this.scrollActiveIntoView();
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() => {
      const el = this.listRef().nativeElement.querySelector<HTMLElement>(`#${this.listId}-${this.active()}`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }
}
