import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { LucideArrowLeft, LucideBrain } from '@lucide/angular';
import { CategoryIcon } from '../../../shared/components/category-icon/category-icon';
import { MarkdownEditor } from '../../../shared/components/markdown-editor/markdown-editor';
import { FormSkeleton } from './form-skeleton';
import { NotesService } from '../../../core/services/notes.service';
import { CategoriesService } from '../../../core/services/categories.service';
import type { Category, Note, CreateNotePayload, ConfidenceLevel, ContentBlock } from '../../../core/models';

@Component({
  selector: 'app-note-form',
  imports: [
    ReactiveFormsModule,
    LucideArrowLeft, LucideBrain,
    CategoryIcon,
    MarkdownEditor,
    FormSkeleton,
  ],
  templateUrl: './note-form.html',
  styleUrl: './note-form.scss',
})
export class NoteForm implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);
  protected categories: Category[] = [];
  protected isEditing = false;
  private noteId: string | null = null;
  protected loading = false;
  protected submitting = false;
  protected error = '';

  protected readonly confidenceLevels: { value: ConfidenceLevel; label: string; desc: string }[] = [
    { value: 'need_practice', label: 'Need Practice', desc: 'Still learning the basics' },
    { value: 'getting_there', label: 'Getting There', desc: 'Understand core concepts' },
    { value: 'confident', label: 'Confident', desc: 'Can explain it to others' },
  ];

  protected readonly confidenceColors: Record<ConfidenceLevel, string> = {
    need_practice: 'var(--color-confidence-need-practice)',
    getting_there: 'var(--color-confidence-getting-there)',
    confident: 'var(--color-confidence-confident)',
  };

  protected form = this.fb.group({
    title: ['', Validators.required],
    category_id: ['', Validators.required],
    confidence_level: ['need_practice' as ConfidenceLevel],
    body_markdown: [''],
  });

  ngOnInit(): void {
    this.loading = true;
    this.loadCategories();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      this.noteId = id;
      this.loadNote(id);
    } else {
      this.loading = false;
    }
  }

  private loadCategories(): void {
    this.categoriesService.seedDefaults().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.cdr.detectChanges();
      },
      error: () => {
        this.categories = [];
        this.cdr.detectChanges();
      },
    });
  }

  private loadNote(id: string): void {
    this.notesService.getById(id).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (note) => {
        this.form.patchValue({
          title: note.title,
          category_id: note.category_id,
          confidence_level: note.confidence_level,
          body_markdown: note.body_markdown ?? this.blocksToMarkdown(note),
        });
      },
      error: () => {
        this.error = 'Failed to load note';
      },
    });
  }

  private blocksToMarkdown(note: Note): string {
    const blocks = note.content_blocks ?? this.legacyToBlocks(note);
    return blocks.map((b) => {
      switch (b.type) {
        case 'text':
          return b.content;
        case 'code':
          return '```' + (b.language || '') + '\n' + b.code + '\n```';
        case 'link':
          return '[' + (b.label || b.url) + '](' + b.url + ')';
      }
    }).join('\n\n');
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

  private parseMarkdownToBlocks(md: string): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    const lines = md.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      const codeMatch = line.match(/^```(\w*)/);
      if (codeMatch) {
        const language = codeMatch[1];
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        blocks.push({ type: 'code', language, code: codeLines.join('\n') });
        continue;
      }

      const linkMatch = line.match(/^\[(.+?)\]\((https?:\/\/.+?)\)$/);
      if (linkMatch) {
        blocks.push({ type: 'link', label: linkMatch[1], url: linkMatch[2] });
        i++;
        continue;
      }

      const textLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```') && !lines[i].match(/^\[.+?\]\(https?:\/\/.+?\)$/)) {
        textLines.push(lines[i]);
        i++;
      }
      const text = textLines.join('\n').trim();
      if (text) {
        blocks.push({ type: 'text', content: text });
      }
    }

    return blocks;
  }

  protected selectCategory(catId: string): void {
    this.form.patchValue({ category_id: catId });
  }

  protected onMarkdownChange(value: string): void {
    this.form.patchValue({ body_markdown: value });
  }

  protected submitLabel(): string {
    if (this.submitting) return 'Saving...';
    return this.isEditing ? 'Update Note' : 'Save Note';
  }

  private buildPayload(): CreateNotePayload {
    const raw = this.form.value;
    const bodyMarkdown = raw.body_markdown || '';
    const contentBlocks = this.parseMarkdownToBlocks(bodyMarkdown);

    const description = contentBlocks
      .filter((b): b is { type: 'text'; content: string } => b.type === 'text')
      .map((b) => b.content)
      .join('\n\n');

    const codeSnippets = contentBlocks
      .filter((b): b is { type: 'code'; language: string; code: string } => b.type === 'code')
      .map((b) => ({ language: b.language || '', code: b.code }));

    const links = contentBlocks
      .filter((b): b is { type: 'link'; label: string; url: string } => b.type === 'link')
      .map((b) => ({ label: b.label || b.url, url: b.url }));

    return {
      title: raw.title!,
      category_id: raw.category_id!,
      description: description || undefined,
      code_snippets: codeSnippets,
      links: links,
      content_blocks: contentBlocks,
      body_markdown: bodyMarkdown || undefined,
      confidence_level: (raw.confidence_level as ConfidenceLevel) || 'need_practice',
    };
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.error = '';

    const payload = this.buildPayload();

    const obs = this.isEditing && this.noteId
      ? this.notesService.update(this.noteId, payload)
      : this.notesService.create(payload);

    obs.subscribe({
      next: (note) => {
        this.router.navigate(['/notes', note.id], { replaceUrl: true });
      },
      error: (err) => {
        this.submitting = false;
        this.error = err.message || 'Failed to save note';
      },
    });
  }

  protected goBack(): void {
    if (this.noteId) {
      this.location.back();
    } else {
      this.router.navigate(['/my-notes']);
    }
  }
}
