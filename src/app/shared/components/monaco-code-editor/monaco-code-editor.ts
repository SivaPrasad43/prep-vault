import { Component, input, output, effect, ElementRef, inject, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule, type MonacoStandaloneCodeEditor, type MonacoEditorConstructionOptions } from '@materia-ui/ngx-monaco-editor';

@Component({
  selector: 'app-monaco-code-editor',
  imports: [MonacoEditorModule, FormsModule],
  templateUrl: './monaco-code-editor.html',
  styleUrl: './monaco-code-editor.scss',
})
export class MonacoCodeEditor {
  private platformId = inject(PLATFORM_ID);
  private editor: MonacoStandaloneCodeEditor | null = null;

  readonly code = input<string>('');
  readonly language = input<string>('');
  readonly readonly = input(true);
  readonly fontSize = input<number>(13);
  readonly fullscreen = input(false);

  readonly codeChange = output<string>();

  private editorContainer = viewChild.required<ElementRef<HTMLDivElement>>('editorContainer');

  protected editorOptions: MonacoEditorConstructionOptions = {};

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    effect(() => {
      const lang = this.language();
      const ro = this.readonly();
      const fs = this.fontSize();
      this.editorOptions = {
        language: this.mapLanguage(lang),
        theme: 'vs-dark',
        readOnly: ro,
        fontSize: fs,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        tabSize: 2,
        automaticLayout: true,
        wordWrap: 'on',
        padding: { top: 8, bottom: 8 },
        scrollbar: { vertical: 'hidden', horizontal: 'auto' },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
      };
    });
    effect(() => {
      const isFullscreen = this.fullscreen();
      if (!this.editor) return;
      if (isFullscreen) {
        this.editorContainer().nativeElement.style.height = '';
        this.editor.updateOptions({ scrollbar: { vertical: 'auto' } });
        requestAnimationFrame(() => this.editor?.layout());
      } else {
        this.editor.updateOptions({ scrollbar: { vertical: 'hidden' } });
        this.updateEditorHeight();
      }
    });
  }

  protected onInit(editor: MonacoStandaloneCodeEditor): void {
    this.editor = editor;
    editor.onDidContentSizeChange(() => this.updateEditorHeight());
    editor.onDidChangeModelContent(() => {
      this.codeChange.emit(editor.getValue());
    });
    this.updateEditorHeight();
  }

  private updateEditorHeight(): void {
    if (!this.editor || this.fullscreen()) return;
    const minHeight = this.readonly() ? 40 : 150;
    const contentHeight = Math.max(minHeight, Math.min(this.editor.getContentHeight(), 600));
    const container = this.editorContainer().nativeElement;
    container.style.height = `${contentHeight}px`;
    requestAnimationFrame(() => this.editor?.layout());
  }

  private mapLanguage(lang: string): string {
    const map: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'typescript',
      python: 'python',
      java: 'java',
      go: 'go',
      rust: 'rust',
      cpp: 'cpp',
      c: 'c',
      sql: 'sql',
      bash: 'shell',
      html: 'html',
      css: 'css',
      json: 'json',
      yaml: 'yaml',
      markdown: 'markdown',
      xml: 'xml',
      php: 'php',
      ruby: 'ruby',
    };
    return map[lang] || 'plaintext';
  }
}
