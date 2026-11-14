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
import { lucideCheck, lucideSearch } from '@ng-icons/lucide';
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
  viewProviders: [provideIcons({ lucideCheck, lucideSearch })],
  host: {
    class:
      'flex max-h-80 w-full flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-sheet',
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
          class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm select-none"
          [class.bg-muted]="i === active()"
          (mouseenter)="active.set(i)"
          (mousedown)="$event.preventDefault()"
          (click)="pick(opt)"
        >
          @if (opt.dot) {
            <span class="size-2.5 shrink-0 rounded-full" [style.background]="opt.color"></span>
          } @else if (opt.icon) {
            <app-category-icon [icon]="opt.icon" class="shrink-0 text-base" [style.color]="opt.color" />
          }
          <span class="min-w-0 flex-1 truncate">{{ opt.label }}</span>
          @if (opt.hint) {
            <span class="shrink-0 text-xs text-muted-foreground">{{ opt.hint }}</span>
          }
          <ng-icon
            name="lucideCheck"
            class="shrink-0 text-primary"
            [class.invisible]="opt.value !== value()"
          />
        </li>
      } @empty {
        <li class="px-2.5 py-6 text-center text-sm text-muted-foreground">No matches</li>
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

  readonly picked = output<string>();
  readonly closed = output<void>();

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

  protected readonly activeId = computed(() =>
    this.filtered().length ? `${this.listId}-${this.active()}` : null,
  );

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
    const count = this.filtered().length;
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
