import { Component, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideListTree } from '@ng-icons/lucide';
import type { EditorHeading } from '../block-editor/block-editor';

interface TocNode {
  heading: EditorHeading;
  depth: number;
  children: TocNode[];
}

/** Nest flat headings by level (H1 › H2 › H3; deeper levels attach to the nearest shallower one). */
function buildTree(headings: EditorHeading[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  for (const h of headings) {
    while (stack.length && stack[stack.length - 1].heading.level >= h.level) stack.pop();
    const node: TocNode = { heading: h, depth: stack.length, children: [] };
    (stack.length ? stack[stack.length - 1].children : roots).push(node);
    stack.push(node);
  }
  return roots;
}

/**
 * Collapsible tree of a note's headings. Click (or Enter) to jump; Left/Right
 * collapse/expand a branch.
 */
@Component({
  selector: 'app-note-toc',
  imports: [NgTemplateOutlet, NgIcon],
  viewProviders: [provideIcons({ lucideChevronRight, lucideListTree })],
  template: `
    <div class="mb-2 flex items-center gap-2 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      <ng-icon name="lucideListTree" class="text-sm" />
      Contents
    </div>

    @if (tree().length) {
      <ul role="tree" aria-label="Note contents" class="space-y-px">
        @for (node of tree(); track node.heading.id) {
          <ng-container *ngTemplateOutlet="item; context: { $implicit: node }" />
        }
      </ul>
    } @else {
      <p class="px-2 py-3 text-sm text-muted-foreground">
        Add headings (type <kbd class="rounded border px-1 font-mono text-xs">#</kbd> or use
        <kbd class="rounded border px-1 font-mono text-xs">/</kbd>) to build contents.
      </p>
    }

    <ng-template #item let-node>
      @let open = !collapsed().has(node.heading.id);
      <li role="treeitem" [attr.aria-expanded]="node.children.length ? open : null" [attr.aria-level]="node.depth + 1">
        <div
          class="group flex items-center rounded-md pr-2 hover:bg-muted"
          [style.padding-left.rem]="0.25 + node.depth * 0.85"
        >
          @if (node.children.length) {
            <button
              type="button"
              class="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"
              [attr.aria-label]="(open ? 'Collapse ' : 'Expand ') + (node.heading.text || 'section')"
              (click)="toggle(node.heading.id)"
            >
              <ng-icon name="lucideChevronRight" class="text-sm transition-transform" [class.rotate-90]="open" />
            </button>
          } @else {
            <span class="size-6 shrink-0"></span>
          }
          <button
            type="button"
            class="min-w-0 flex-1 truncate py-1.5 text-left text-sm outline-none focus-visible:underline"
            [class.font-semibold]="node.depth === 0"
            [class.text-muted-foreground]="node.depth > 0 || !node.heading.text"
            [class.italic]="!node.heading.text"
            [title]="node.heading.text || 'Untitled heading'"
            (click)="jump.emit(node.heading.pos)"
            (keydown)="onKey($event, node)"
          >
            {{ node.heading.text || 'Untitled heading' }}
          </button>
        </div>
        @if (node.children.length && open) {
          <ul role="group" class="space-y-px">
            @for (child of node.children; track child.heading.id) {
              <ng-container *ngTemplateOutlet="item; context: { $implicit: child }" />
            }
          </ul>
        }
      </li>
    </ng-template>
  `,
})
export class NoteToc {
  readonly headings = input<EditorHeading[]>([]);
  readonly jump = output<number>();

  protected readonly tree = computed(() => buildTree(this.headings()));
  protected readonly collapsed = signal<Set<string>>(new Set());

  protected toggle(id: string): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected onKey(event: KeyboardEvent, node: TocNode): void {
    if (!node.children.length) return;
    const isOpen = !this.collapsed().has(node.heading.id);
    if ((event.key === 'ArrowLeft' && isOpen) || (event.key === 'ArrowRight' && !isOpen)) {
      event.preventDefault();
      this.toggle(node.heading.id);
    }
  }
}
