import { Component, ElementRef, computed, input, model, output, signal, viewChild } from '@angular/core';
import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { CategoryIcon } from '../category-icon/category-icon';
import { SelectMenu } from './select-menu';
import type { SelectOption } from './select-option';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

/**
 * App-wide dropdown: a trigger button showing the selected option (icon / color dot + label)
 * and a popover `app-select-menu`. Two-way bind with `[(value)]`.
 *
 * `variant="field"` = bordered input look; `variant="ghost"` = inline/borderless (property rows).
 */
@Component({
  selector: 'app-select',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, NgIcon, CategoryIcon, SelectMenu],
  viewProviders: [provideIcons({ lucideChevronDown })],
  host: { class: 'inline-flex min-w-0' },
  template: `
    <button
      #trigger
      type="button"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      class="flex w-full min-w-0 items-center gap-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      [class]="triggerClasses()"
      [attr.aria-label]="ariaLabel()"
      aria-haspopup="listbox"
      [attr.aria-expanded]="open()"
      [disabled]="disabled()"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
    >
      @if (selected(); as opt) {
        @if (opt.dot) {
          <span class="size-2.5 shrink-0 rounded-full" [style.background]="opt.color"></span>
        } @else if (opt.icon) {
          <app-category-icon [icon]="opt.icon" class="shrink-0" [style.color]="opt.color ? 'color-mix(in oklab, ' + opt.color + ' var(--cat-strength), var(--foreground))' : null" />
        }
        <span class="min-w-0 flex-1 truncate">{{ opt.label }}</span>
      } @else {
        <span class="min-w-0 flex-1 truncate text-muted-foreground">{{ placeholder() }}</span>
      }
      <ng-icon
        name="lucideChevronDown"
        class="shrink-0 text-muted-foreground transition-transform"
        [class.rotate-180]="open()"
      />
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayMinWidth]="menuMinWidth()"
      [cdkConnectedOverlayWidth]="menuWidth() ?? menuMinWidth()"
      [cdkConnectedOverlayPush]="true"
      [cdkConnectedOverlayViewportMargin]="8"
      (overlayOutsideClick)="close(false)"
      (detach)="open.set(false)"
    >
      <app-select-menu
        width="100%"
        [options]="options()"
        [value]="value()"
        [searchable]="isSearchable()"
        [searchPlaceholder]="searchPlaceholder()"
        [label]="ariaLabel()"
        [creatable]="creatable()"
        [createLabel]="createLabel()"
        (picked)="choose($event)"
        (closed)="close(true)"
        (create)="close(false); create.emit($event)"
        (edit)="close(false); edit.emit($event)"
      />
    </ng-template>
  `,
})
export class AppSelect {
  readonly options = input.required<SelectOption[]>();
  readonly value = model<string | null>(null);
  readonly placeholder = input('Select…');
  readonly ariaLabel = input('Select an option');
  readonly searchPlaceholder = input('Search…');
  /** true / false, or undefined = auto (search when more than 7 options). */
  readonly searchable = input<boolean | undefined>(undefined);
  readonly disabled = input(false);
  readonly variant = input<'field' | 'ghost'>('field');
  /** Offer "+ Create “…”" for unknown typed text (emits `create`). */
  readonly creatable = input(false);
  readonly createLabel = input('Create');
  readonly create = output<string>();
  /** ⋯ clicked on an editable option. */
  readonly edit = output<string>();

  /** Popover width in px; defaults to at least the trigger width. */
  readonly menuWidth = input<number | undefined>(undefined);

  protected readonly open = signal(false);
  protected readonly positions = POSITIONS;
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly triggerWidth = signal(0);

  protected readonly selected = computed(
    () => this.options().find((o) => o.value === this.value()) ?? null,
  );
  protected readonly isSearchable = computed(() => this.searchable() ?? this.options().length > 7);
  protected readonly menuMinWidth = computed(() => Math.min(Math.max(this.triggerWidth(), 248), 320));

  protected readonly triggerClasses = computed(() =>
    this.variant() === 'ghost'
      ? 'h-8 rounded-md px-2 text-sm hover:bg-muted'
      : 'h-9 rounded-lg border bg-card px-3 text-sm shadow-xs hover:bg-muted/60',
  );

  protected toggle(): void {
    if (this.open()) {
      this.close(false);
    } else {
      this.triggerWidth.set(this.trigger().nativeElement.offsetWidth);
      this.open.set(true);
    }
  }

  protected choose(value: string): void {
    this.value.set(value);
    this.close(true);
  }

  protected close(refocus: boolean): void {
    this.open.set(false);
    if (refocus) this.trigger().nativeElement.focus();
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (!this.open() && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.toggle();
    }
  }
}
