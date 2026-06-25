import { Component, OnInit, inject, signal, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucidePencil, LucideTrash2, LucideCalendar } from '@lucide/angular';
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
import { NotesService } from '../../../core/services/notes.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { RevisionsService } from '../../../core/services/revisions.service';
import { CategoryBadge } from '../../../shared/components/category-badge/category-badge';
import { ConfidenceIndicator } from '../../../shared/components/confidence-indicator/confidence-indicator';
import { Modal } from '../../../shared/components/modal/modal';
import { DetailSkeleton } from './detail-skeleton';
import type { Note, Category, ContentBlock } from '../../../core/models';

@Component({
  selector: 'app-note-detail',
  imports: [DatePipe, RouterLink, LucideArrowLeft, LucidePencil, LucideTrash2, LucideCalendar, CategoryBadge, ConfidenceIndicator, Modal, DetailSkeleton],
  templateUrl: './note-detail.html',
  styleUrl: './note-detail.scss',
})
export class NoteDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private revisionsService = inject(RevisionsService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private sanitizer = inject(DomSanitizer);

  protected note = signal<Note | null>(null);
  protected category = signal<Category | null>(null);
  protected showDeleteConfirm = false;
  protected loading = signal(true);
  protected deleting = false;
  protected renderedHtml = signal<SafeHtml | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadNote(id);
      }
    });
  }

  private loadNote(id: string): void {
    this.notesService.getById(id).subscribe({
      next: (n) => {
        this.note.set(n);
        this.loadCategory(n.category_id);
        this.loading.set(false);
        this.renderNoteContent(n);
        this.cdr.detectChanges();
        this.revisionsService.log(id).subscribe();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.detectChanges();
        this.router.navigate(['/my-notes']);
      },
    });
  }

  private loadCategory(categoryId: string): void {
    this.categoriesService.getById(categoryId).subscribe({
      next: (cat) => {
        this.category.set(cat);
      },
    });
  }

  private renderNoteContent(n: Note): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (n.body_markdown) {
      marked.parse(n.body_markdown, { async: true, gfm: true, breaks: true }).then((raw) => {
        this.renderedHtml.set(this.sanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(raw as string)));
        this.cdr.detectChanges();
      });
    }
  }

  protected hasRenderedContent(): boolean {
    return this.renderedHtml() !== null;
  }

  protected getBlocks(): ContentBlock[] {
    const n = this.note();
    if (!n) return [];
    return n.content_blocks ?? this.legacyToBlocks(n);
  }

  private legacyToBlocks(note: Note): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    if (note.description) {
      blocks.push({ type: 'text', content: note.description });
    }
    for (const s of note.code_snippets ?? []) {
      if (s.code) {
        blocks.push({ type: 'code', language: s.language, code: s.code, filename: s.filename });
      }
    }
    for (const l of note.links ?? []) {
      if (l.url) {
        blocks.push({ type: 'link', label: l.label, url: l.url });
      }
    }
    return blocks;
  }

  protected highlightedCode(code: string, language: string): SafeHtml {
    if (!isPlatformBrowser(this.platformId)) {
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(code));
    }
    const lang = this.mapHighlightLanguage(language);
    try {
      if (lang && hljs.getLanguage(lang)) {
        return this.sanitizer.bypassSecurityTrustHtml(hljs.highlight(code, { language: lang }).value);
      }
      const result = hljs.highlightAuto(code);
      return this.sanitizer.bypassSecurityTrustHtml(result.value);
    } catch {
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(code));
    }
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private mapHighlightLanguage(lang: string): string {
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
      bash: 'bash',
      html: 'html',
      css: 'css',
      json: 'json',
      yaml: 'yaml',
      markdown: 'markdown',
      xml: 'xml',
      php: 'php',
      ruby: 'ruby',
    };
    return map[lang] || '';
  }

  protected languageLabel(lang: string): string {
    const labels: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      go: 'Go',
      rust: 'Rust',
      cpp: 'C++',
      sql: 'SQL',
      bash: 'Bash',
    };
    return labels[lang] || lang;
  }

  protected onDelete(): void {
    const n = this.note();
    if (!n) return;
    this.deleting = true;
    this.notesService.delete(n.id).subscribe({
      next: () => {
        this.router.navigate(['/my-notes']);
      },
      error: () => {
        this.deleting = false;
        this.showDeleteConfirm = false;
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/my-notes']);
  }
}
