import { Component, input, output, signal, effect, viewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideBold, LucideItalic, LucideHeading1, LucideHeading2, LucideHeading3,
  LucideLink, LucideCode, LucideList, LucideListOrdered, LucideQuote,
  LucideEye, LucideEyeClosed, LucideFileCode,
} from '@lucide/angular';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code: string, lang: string): string {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      return code;
    }
  },
}));

@Component({
  selector: 'app-markdown-editor',
  imports: [
    FormsModule,
    LucideBold, LucideItalic, LucideHeading1, LucideHeading2, LucideHeading3,
    LucideLink, LucideCode, LucideList, LucideListOrdered, LucideQuote,
    LucideEye, LucideEyeClosed, LucideFileCode,
  ],
  templateUrl: './markdown-editor.html',
  styleUrl: './markdown-editor.scss',
})
export class MarkdownEditor implements AfterViewInit {
  readonly value = input<string>('');
  readonly valueChange = output<string>();

  protected showPreview = signal(false);
  protected renderedHtml = signal('');
  protected isPreviewLoading = signal(false);

  private editorRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('editor');

  constructor() {
    effect(() => {
      const ta = this.editorRef()?.nativeElement;
      const v = this.value();
      if (ta && v !== ta.value) {
        ta.value = v ?? '';
      }
    });
  }

  ngAfterViewInit(): void {
    this.ta.value = this.value() ?? '';
  }

  private get ta(): HTMLTextAreaElement {
    return this.editorRef().nativeElement;
  }

  protected onInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.valueChange.emit(val);
  }

  protected togglePreview(): void {
    const next = !this.showPreview();
    this.showPreview.set(next);
    if (next) {
      this.isPreviewLoading.set(true);
      this.renderPreview(this.ta.value).then(() => this.isPreviewLoading.set(false));
    }
  }

  private async renderPreview(md: string): Promise<void> {
    if (!md.trim()) {
      this.renderedHtml.set('<p style="color: var(--color-text-muted); font-style: italic;">Nothing to preview</p>');
      return;
    }
    const raw = await marked.parse(md, { async: true, gfm: true, breaks: true });
    this.renderedHtml.set(DOMPurify.sanitize(raw as string));
  }

  private getSel(): { start: number; end: number; text: string } {
    const start = this.ta.selectionStart;
    const end = this.ta.selectionEnd;
    return { start, end, text: this.ta.value.substring(start, end) };
  }

  private replace(newVal: string, cursor: number): void {
    this.ta.value = newVal;
    this.ta.dispatchEvent(new Event('input', { bubbles: true }));
    this.ta.focus();
    this.ta.setSelectionRange(cursor, cursor);
  }

  protected toggleBold(): void {
    const { start, end, text } = this.getSel();
    if (text) {
      this.replace(
        this.ta.value.substring(0, start) + `**${text}**` + this.ta.value.substring(end),
        start + 2 + text.length,
      );
    } else {
      this.replace(
        this.ta.value.substring(0, start) + `****` + this.ta.value.substring(end),
        start + 2,
      );
    }
  }

  protected toggleItalic(): void {
    const { start, end, text } = this.getSel();
    if (text) {
      this.replace(
        this.ta.value.substring(0, start) + `*${text}*` + this.ta.value.substring(end),
        start + 1 + text.length,
      );
    } else {
      this.replace(
        this.ta.value.substring(0, start) + `**` + this.ta.value.substring(end),
        start + 1,
      );
    }
  }

  private insertLinePrefix(prefix: string): void {
    const start = this.ta.selectionStart;
    const text = this.ta.value;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const newVal = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    this.replace(newVal, lineStart + prefix.length + (start - lineStart));
  }

  protected toggleHeading1(): void { this.insertLinePrefix('# '); }
  protected toggleHeading2(): void { this.insertLinePrefix('## '); }
  protected toggleHeading3(): void { this.insertLinePrefix('### '); }

  protected toggleLink(): void {
    const { start, end, text } = this.getSel();
    if (text) {
      this.replace(
        this.ta.value.substring(0, start) + `[${text}](url)` + this.ta.value.substring(end),
        start + text.length + 3,
      );
    } else {
      this.replace(
        this.ta.value.substring(0, start) + `[text](url)` + this.ta.value.substring(end),
        start + 1,
      );
    }
  }

  protected toggleCode(): void {
    const { start, end, text } = this.getSel();
    if (text) {
      this.replace(
        this.ta.value.substring(0, start) + `\`${text}\`` + this.ta.value.substring(end),
        start + 1 + text.length,
      );
    } else {
      this.replace(
        this.ta.value.substring(0, start) + `\`\`` + this.ta.value.substring(end),
        start + 1,
      );
    }
  }

  protected toggleCodeBlock(): void {
    const { start, end, text } = this.getSel();
    const insertion = text
      ? `\`\`\`\n${text}\n\`\`\``
      : `\`\`\`\n\n\`\`\``;
    const newVal = this.ta.value.substring(0, start) + insertion + this.ta.value.substring(end);
    const cursor = text ? start + insertion.length : start + 4;
    this.replace(newVal, cursor);
  }

  protected toggleUnorderedList(): void { this.insertLinePrefix('- '); }
  protected toggleOrderedList(): void { this.insertLinePrefix('1. '); }
  protected toggleBlockquote(): void { this.insertLinePrefix('> '); }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'b': event.preventDefault(); this.toggleBold(); return;
        case 'i': event.preventDefault(); this.toggleItalic(); return;
        case 'k': event.preventDefault(); this.toggleLink(); return;
      }
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const { start, end } = this.getSel();
      this.replace(
        this.ta.value.substring(0, start) + '  ' + this.ta.value.substring(end),
        start + 2,
      );
    }
  }
}
