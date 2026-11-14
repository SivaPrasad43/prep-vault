import {
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  afterNextRender,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Editor, Extension, type Range } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion';
import { createLowlight, all } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBold, lucideItalic, lucideCode, lucideLink, lucideHeading1, lucideHeading2, lucideHeading3,
  lucideList, lucideListOrdered, lucideListTodo, lucideQuote, lucideFileCode, lucideMinus, lucideType,
} from '@ng-icons/lucide';

/** Same grammar set highlight.js used for the old markdown renderer (all languages). */
const lowlight = createLowlight(all);

export const CODE_LANGUAGES: { value: string; label: string }[] = [
  { value: '', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'html', label: 'HTML' },
  { value: 'xml', label: 'XML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
];

type SlashIcon =
  | 'text' | 'h1' | 'h2' | 'h3' | 'bullet' | 'ordered' | 'todo' | 'quote' | 'code' | 'divider';

interface SlashItem {
  title: string;
  hint: string;
  icon: SlashIcon;
  keywords: string[];
  run: (editor: Editor, range: Range) => void;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    title: 'Text', hint: 'Plain paragraph', icon: 'text', keywords: ['paragraph', 'p'],
    run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run(),
  },
  {
    title: 'Heading 1', hint: 'Big section heading', icon: 'h1', keywords: ['h1', 'title'],
    run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Heading 2', hint: 'Medium section heading', icon: 'h2', keywords: ['h2', 'subtitle'],
    run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Heading 3', hint: 'Small section heading', icon: 'h3', keywords: ['h3'],
    run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Bulleted list', hint: 'Simple bulleted list', icon: 'bullet', keywords: ['ul', 'bullet', 'unordered'],
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run(),
  },
  {
    title: 'Numbered list', hint: 'List with numbering', icon: 'ordered', keywords: ['ol', 'ordered', 'number'],
    run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run(),
  },
  {
    title: 'To-do list', hint: 'Track tasks with checkboxes', icon: 'todo', keywords: ['todo', 'task', 'check'],
    run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run(),
  },
  {
    title: 'Quote', hint: 'Capture a quote', icon: 'quote', keywords: ['blockquote', 'quote'],
    run: (e, r) => e.chain().focus().deleteRange(r).setBlockquote().run(),
  },
  {
    title: 'Code block', hint: 'Code with syntax highlighting', icon: 'code', keywords: ['code', 'pre', 'snippet'],
    run: (e, r) => e.chain().focus().deleteRange(r).setCodeBlock().run(),
  },
  {
    title: 'Divider', hint: 'Visual separator', icon: 'divider', keywords: ['hr', 'divider', 'line', 'separator'],
    run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run(),
  },
];

function filterSlashItems(query: string): SlashItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (i) => i.title.toLowerCase().includes(q) || i.keywords.some((k) => k.startsWith(q)),
  );
}

/** Code block with a language picker rendered above the highlighted code. */
const CodeBlockWithLanguage = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;
      const dom = document.createElement('div');
      dom.className = 'be-code';

      const header = document.createElement('div');
      header.className = 'be-code__header';
      header.contentEditable = 'false';

      const select = document.createElement('select');
      select.className = 'be-code__lang';
      select.setAttribute('aria-label', 'Code language');
      const fillOptions = (lang: string) => {
        select.replaceChildren();
        const options = CODE_LANGUAGES.some((l) => l.value === lang)
          ? CODE_LANGUAGES
          : [...CODE_LANGUAGES, { value: lang, label: lang }];
        for (const l of options) {
          const opt = document.createElement('option');
          opt.value = l.value;
          opt.textContent = l.label;
          select.appendChild(opt);
        }
        select.value = lang;
      };
      fillOptions(current.attrs['language'] ?? '');
      select.disabled = !editor.isEditable;
      select.addEventListener('change', () => {
        const pos = typeof getPos === 'function' ? getPos() : undefined;
        if (pos == null) return;
        editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, { ...current.attrs, language: select.value || null });
            return true;
          })
          .run();
      });
      const copyIcon =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
      const checkIcon =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'be-code__copy';
      copy.setAttribute('aria-label', 'Copy code');
      copy.innerHTML = copyIcon + '<span>Copy</span>';
      let copyTimer: ReturnType<typeof setTimeout> | undefined;
      copy.addEventListener('click', () => {
        navigator.clipboard?.writeText(current.textContent).then(() => {
          copy.dataset['copied'] = 'true';
          copy.innerHTML = checkIcon + '<span>Copied</span>';
          clearTimeout(copyTimer);
          copyTimer = setTimeout(() => {
            delete copy.dataset['copied'];
            copy.innerHTML = copyIcon + '<span>Copy</span>';
          }, 1500);
        });
      });

      header.append(select, copy);

      const pre = document.createElement('pre');
      pre.className = 'hljs';
      const code = document.createElement('code');
      pre.appendChild(code);

      dom.append(header, pre);

      return {
        dom,
        contentDOM: code,
        update: (updated) => {
          if (updated.type !== current.type) return false;
          const lang = updated.attrs['language'] ?? '';
          if (lang !== (current.attrs['language'] ?? '')) fillOptions(lang);
          current = updated;
          return true;
        },
        stopEvent: (event) => header.contains(event.target as Node),
        destroy: () => clearTimeout(copyTimer),
        ignoreMutation: (mutation) => header.contains(mutation.target as Node),
      };
    };
  },
});

interface SlashState {
  items: SlashItem[];
  active: number;
  top: number;
  left: number;
}

interface BubbleState {
  top: number;
  left: number;
  bold: boolean;
  italic: boolean;
  code: boolean;
  link: boolean;
}

@Component({
  selector: 'app-block-editor',
  imports: [NgIcon],
  templateUrl: './block-editor.html',
  styleUrl: './block-editor.css',
  viewProviders: [
    provideIcons({
      lucideBold, lucideItalic, lucideCode, lucideLink, lucideHeading1, lucideHeading2, lucideHeading3,
      lucideList, lucideListOrdered, lucideListTodo, lucideQuote, lucideFileCode, lucideMinus, lucideType,
    }),
  ],
  encapsulation: ViewEncapsulation.None,
})
export class BlockEditor implements OnDestroy {
  /** Markdown content. Re-applied only when it differs from what the editor last emitted. */
  readonly value = input<string>('');
  readonly placeholder = input<string>("Type '/' for commands…");
  /** Emits markdown, only when the document really changed (not on load/normalisation). */
  readonly valueChange = output<string>();

  protected readonly slash = signal<SlashState | null>(null);
  protected readonly bubble = signal<BubbleState | null>(null);
  protected readonly linkMode = signal(false);
  protected readonly linkValue = signal('');

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly linkInput = viewChild<ElementRef<HTMLInputElement>>('linkInput');

  private editor: Editor | null = null;
  /** Markdown the editor currently represents (serialised form). */
  private lastMarkdown = '';
  /** Raw `value()` last applied or emitted, to ignore our own echo. */
  private lastValue: string | null = null;
  private slashProps: SuggestionProps<SlashItem> | null = null;
  private readonly onScroll = () => this.updateBubble();

  constructor() {
    afterNextRender(() => this.createEditor());

    effect(() => {
      const v = this.value() ?? '';
      untracked(() => {
        if (!this.editor || v === this.lastValue) return;
        this.lastValue = v;
        this.editor.commands.setContent(v, { emitUpdate: false });
        this.lastMarkdown = this.getMarkdown();
      });
    });
  }

  focus(position: 'start' | 'end' = 'start'): void {
    this.editor?.commands.focus(position);
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll, true);
    this.editor?.destroy();
    this.editor = null;
  }

  private createEditor(): void {
    const initial = this.value() ?? '';
    const slashExtension = this.createSlashExtension();

    this.editor = new Editor({
      element: this.host().nativeElement,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          link: false,
          heading: { levels: [1, 2, 3, 4, 5, 6] },
        }),
        CodeBlockWithLanguage.configure({ lowlight, defaultLanguage: null }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Image,
        TableKit.configure({ table: { resizable: false } }),
        Placeholder.configure({
          placeholder: ({ node }) =>
            node.type.name === 'heading' ? `Heading ${node.attrs['level']}` : this.placeholder(),
        }),
        Markdown.configure({
          html: true,
          tightLists: true,
          bulletListMarker: '-',
          linkify: true,
          breaks: true,
          transformPastedText: true,
          transformCopiedText: true,
        }),
        slashExtension,
      ],
      content: initial,
      editorProps: {
        attributes: { class: 'be-prose', spellcheck: 'true' },
        handleClickOn: (_view, _pos, _node, _nodePos, event) => {
          // Cmd/Ctrl-click opens links (plain click edits them).
          const a = (event.target as HTMLElement).closest('a');
          if (a && (event.metaKey || event.ctrlKey)) {
            window.open(a.href, '_blank', 'noopener');
            return true;
          }
          return false;
        },
      },
      onUpdate: () => {
        const md = this.getMarkdown();
        if (md === this.lastMarkdown) return;
        this.lastMarkdown = md;
        this.lastValue = md;
        this.valueChange.emit(md);
      },
      onSelectionUpdate: () => this.updateBubble(),
      onBlur: ({ event }) => {
        const next = event.relatedTarget as Node | null;
        if (next && this.host().nativeElement.parentElement?.contains(next)) return;
        if (!this.linkMode()) this.bubble.set(null);
      },
      onFocus: () => this.updateBubble(),
    });

    this.lastValue = initial;
    this.lastMarkdown = this.getMarkdown();
    window.addEventListener('scroll', this.onScroll, true);
  }

  private getMarkdown(): string {
    const storage = this.editor?.storage as unknown as { markdown?: { getMarkdown(): string } };
    return storage?.markdown?.getMarkdown() ?? '';
  }

  // ---------- Slash menu ----------

  private createSlashExtension() {
    const self = this;
    return Extension.create({
      name: 'slashCommand',
      addProseMirrorPlugins() {
        return [
          Suggestion<SlashItem, SlashItem>({
            editor: this.editor,
            char: '/',
            allow: ({ editor }) => !editor.isActive('codeBlock'),
            items: ({ query }) => filterSlashItems(query),
            command: ({ editor, range, props }) => props.run(editor, range),
            render: () => ({
              onStart: (props) => self.openSlash(props),
              onUpdate: (props) => self.openSlash(props),
              onExit: () => self.closeSlash(),
              onKeyDown: ({ event }) => self.slashKeyDown(event),
            }),
          }),
        ];
      },
    });
  }

  private openSlash(props: SuggestionProps<SlashItem>): void {
    this.slashProps = props;
    const rect = props.clientRect?.();
    if (!rect || props.items.length === 0) {
      this.slash.set(props.items.length === 0 && rect ? { items: [], active: 0, top: rect.bottom + 6, left: rect.left } : null);
      return;
    }
    const prev = this.slash();
    const menuHeight = 320;
    const top = rect.bottom + menuHeight > window.innerHeight ? rect.top - menuHeight - 6 : rect.bottom + 6;
    this.slash.set({
      items: props.items,
      active: prev && prev.items === props.items ? prev.active : 0,
      top: Math.max(8, top),
      left: Math.min(rect.left, window.innerWidth - 300),
    });
  }

  private closeSlash(): void {
    this.slashProps = null;
    this.slash.set(null);
  }

  private slashKeyDown(event: KeyboardEvent): boolean {
    const state = this.slash();
    if (!state) return false;
    if (event.key === 'Escape') {
      this.closeSlash();
      return true;
    }
    if (state.items.length === 0) return false;
    if (event.key === 'ArrowDown') {
      this.slash.set({ ...state, active: (state.active + 1) % state.items.length });
      this.scrollActiveIntoView();
      return true;
    }
    if (event.key === 'ArrowUp') {
      this.slash.set({ ...state, active: (state.active - 1 + state.items.length) % state.items.length });
      this.scrollActiveIntoView();
      return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      this.pickSlash(state.active);
      return true;
    }
    return false;
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() =>
      document.querySelector('.be-slash__item--active')?.scrollIntoView({ block: 'nearest' }),
    );
  }

  protected pickSlash(index: number): void {
    const item = this.slash()?.items[index];
    if (item && this.slashProps) this.slashProps.command(item);
  }

  protected hoverSlash(index: number): void {
    const state = this.slash();
    if (state && state.active !== index) this.slash.set({ ...state, active: index });
  }

  // ---------- Bubble menu ----------

  private updateBubble(): void {
    const editor = this.editor;
    if (!editor || this.linkMode()) return;
    const { from, to, empty } = editor.state.selection;
    if (empty || !editor.isFocused || editor.isActive('codeBlock') || !editor.isEditable) {
      this.bubble.set(null);
      return;
    }
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    const top = Math.min(start.top, end.top) - 44;
    const left = (start.left + end.left) / 2;
    this.bubble.set({
      top: top < 8 ? Math.max(start.bottom, end.bottom) + 8 : top,
      left: Math.min(Math.max(left, 100), window.innerWidth - 100),
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      code: editor.isActive('code'),
      link: editor.isActive('link'),
    });
  }

  protected toggleMark(mark: 'bold' | 'italic' | 'code'): void {
    const chain = this.editor?.chain().focus();
    if (!chain) return;
    if (mark === 'bold') chain.toggleBold().run();
    else if (mark === 'italic') chain.toggleItalic().run();
    else chain.toggleCode().run();
    this.updateBubble();
  }

  protected openLinkInput(): void {
    if (!this.editor) return;
    this.linkValue.set((this.editor.getAttributes('link')['href'] as string) ?? '');
    this.linkMode.set(true);
    queueMicrotask(() => this.linkInput()?.nativeElement.focus());
  }

  protected applyLink(): void {
    const editor = this.editor;
    if (!editor) return;
    let href = this.linkValue().trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!href) {
      chain.unsetLink().run();
    } else {
      if (!/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('/') && !href.startsWith('#')) {
        href = 'https://' + href;
      }
      chain.setLink({ href }).run();
    }
    this.linkMode.set(false);
    this.updateBubble();
  }

  protected cancelLink(): void {
    this.linkMode.set(false);
    this.editor?.commands.focus();
    this.updateBubble();
  }

  protected onBubbleMousedown(event: MouseEvent): void {
    // Keep the editor selection when clicking toolbar buttons; let the link input take focus.
    if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
  }

  protected onLinkBlur(): void {
    if (!this.linkMode()) return;
    this.linkMode.set(false);
    this.bubble.set(null);
  }

  protected onLinkKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.applyLink();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelLink();
    }
  }
}
