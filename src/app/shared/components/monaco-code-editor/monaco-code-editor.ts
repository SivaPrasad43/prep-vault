import { Component, input, output, viewChild, AfterViewInit, OnDestroy, effect, PLATFORM_ID, ElementRef, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as monacoType from 'monaco-editor';

@Component({
  selector: 'app-monaco-code-editor',
  imports: [],
  templateUrl: './monaco-code-editor.html',
  styleUrl: './monaco-code-editor.scss',
})
export class MonacoCodeEditor implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private monaco: typeof monacoType | null = null;
  private editorInitialized = false;
  private workerContents = new Map<string, string>();

  readonly code = input<string>('');
  readonly language = input<string>('');

  readonly readonly = input(true);
  readonly fontSize = input<number>(13);
  readonly fullscreen = input(false);

  readonly codeChange = output<string>();

  protected loading = signal(true);

  private editorContainer = viewChild.required<ElementRef<HTMLDivElement>>('editorContainer');
  private editor: monacoType.editor.IStandaloneCodeEditor | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const newLang = this.language();
        if (!this.editor || !this.editorInitialized) return;
        const model = this.editor.getModel();
        if (model && model.getLanguageId() !== this.mapLanguage(newLang)) {
          this.monaco!.editor.setModelLanguage(model, this.mapLanguage(newLang));
        }
      });

      effect(() => {
        const newCode = this.code();
        if (!this.editor || !this.editorInitialized) return;
        if (this.editor.getValue() !== newCode) {
          this.editor.setValue(newCode);
        }
      });

      effect(() => {
        const newFontSize = this.fontSize();
        if (!this.editor || !this.editorInitialized) return;
        this.editor.updateOptions({ fontSize: newFontSize });
      });

      effect(() => {
        const isFullscreen = this.fullscreen();
        if (!this.editor || !this.editorInitialized) return;
        if (isFullscreen) {
          this.editorContainer().nativeElement.style.height = '';
          this.editor.updateOptions({
            scrollbar: { vertical: 'auto' },
          });
          requestAnimationFrame(() => this.editor?.layout());
        } else {
          this.editor.updateOptions({
            scrollbar: { vertical: 'hidden' },
          });
          this.updateEditorHeight();
        }
      });
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const [monaco] = await Promise.all([
      import('monaco-editor'),
      this.prefetchWorkers(),
    ]);
    this.monaco = monaco;
    this.configureMonacoWorkers();
    requestAnimationFrame(() => {
      this.initEditor();
      this.editorInitialized = true;
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.editor?.dispose();
    this.editor = null;
  }

  private async prefetchWorkers(): Promise<void> {
    const labels = [
      'editor/editor',
      'language/typescript/ts',
      'language/json/json',
      'language/css/css',
      'language/html/html',
    ];
    await Promise.allSettled(
      labels.map(async (path) => {
        const res = await fetch(`/monaco-workers/${path}.worker.js`);
        this.workerContents.set(path, await res.text());
      })
    );
  }

  private configureMonacoWorkers(): void {
    if ((self as any).MonacoEnvironment?.getWorker) return;
    (self as any).MonacoEnvironment = {
      getWorker: (_workerId: string, label: string) => {
        const path =
          label === 'typescript' || label === 'javascript'
            ? 'language/typescript/ts'
            : label === 'json'
              ? 'language/json/json'
              : label === 'css'
                ? 'language/css/css'
              : label === 'html'
                ? 'language/html/html'
                : 'editor/editor';
        const content = this.workerContents.get(path);
        if (content) {
          const blob = new Blob([content], { type: 'application/javascript' });
          return new Worker(URL.createObjectURL(blob));
        }
        return new Worker(`/monaco-workers/${path}.worker.js`);
      },
    };
  }

  private initEditor(): void {
    const container = this.editorContainer().nativeElement;

    this.editor = this.monaco!.editor.create(container, {
      value: this.code(),
      language: this.mapLanguage(this.language()),
      readOnly: this.readonly(),
      theme: 'vs-dark',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: this.fontSize(),
      lineNumbers: 'on',
      tabSize: 2,
      automaticLayout: true,
      wordWrap: 'on',
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'auto',
      },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
    });

    this.editor.onDidContentSizeChange(() => this.updateEditorHeight());
    this.updateEditorHeight();

    this.editor.onDidChangeModelContent(() => {
      this.codeChange.emit(this.editor!.getValue());
    });
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
