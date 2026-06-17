import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  LucideArrowLeft, LucideX,
  LucideMoveUp, LucideMoveDown, LucideType, LucideFileCode, LucideLink,
  LucideMaximize2, LucideMinimize2, LucideEraser
} from '@lucide/angular';
import { CategoryIcon } from '../../../shared/components/category-icon/category-icon';
import { MonacoCodeEditor } from '../../../shared/components/monaco-code-editor/monaco-code-editor';
import { FormSkeleton } from './form-skeleton';
import { NotesService } from '../../../core/services/notes.service';
import { CategoriesService } from '../../../core/services/categories.service';
import type { Category, Note, CreateNotePayload, ConfidenceLevel, ContentBlock } from '../../../core/models';

@Component({
  selector: 'app-note-form',
  imports: [
    ReactiveFormsModule,
    LucideArrowLeft, LucideX,
    LucideMoveUp, LucideMoveDown, LucideType, LucideFileCode, LucideLink,
    LucideMaximize2, LucideMinimize2, LucideEraser,
    CategoryIcon,
    MonacoCodeEditor,
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
  protected categories: Category[] = [];
  protected isEditing = false;
  private noteId: string | null = null;
  protected loading = false;
  protected submitting = false;
  protected error = '';
  protected fullscreenBlockIndex: number | null = null;
  protected fullscreenFontSizes: Record<number, number> = {};
  protected readonly FS_FONT_MIN = 10;
  protected readonly FS_FONT_MAX = 32;
  protected readonly FS_FONT_STEP = 2;

  protected getFullscreenFontSize(index: number): number | null {
    return this.fullscreenFontSizes[index] ?? null;
  }

  protected adjustFontSize(index: number, delta: number): void {
    const current = this.fullscreenFontSizes[index] ?? 16;
    const next = Math.max(this.FS_FONT_MIN, Math.min(this.FS_FONT_MAX, current + delta));
    this.fullscreenFontSizes[index] = next;
  }

  protected resetFontSize(index: number): void {
    delete this.fullscreenFontSizes[index];
  }

  protected readonly confidenceLevels: { value: ConfidenceLevel; label: string }[] = [
    { value: 'need_practice', label: 'Need Practice' },
    { value: 'getting_there', label: 'Getting There' },
    { value: 'confident', label: 'Confident' },
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
    content_blocks: this.fb.array<ReturnType<typeof this.createBlockGroup>>([]),
  });

  get contentBlocks(): FormArray {
    return this.form.get('content_blocks') as FormArray;
  }

  protected readonly languages: { value: string; label: string }[] = [
    { value: '', label: 'Auto' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'sql', label: 'SQL' },
    { value: 'bash', label: 'Bash' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'php', label: 'PHP' },
  ];

  private createBlockGroup(type: ContentBlock['type'] = 'text') {
    switch (type) {
      case 'code':
        return this.fb.group({
          type: ['code' as const],
          language: [''],
          code: [''],
        });
      case 'link':
        return this.fb.group({
          type: ['link' as const],
          label: [''],
          url: [''],
        });
      default:
        return this.fb.group({
          type: ['text' as const],
          content: [''],
        });
    }
  }

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
        });

        const blocks = note.content_blocks ?? this.legacyToBlocks(note);
        for (const block of blocks) {
          const group = this.createBlockGroup(block.type);
          group.patchValue(block as never);
          this.contentBlocks.push(group);
        }
      },
      error: () => {
        this.error = 'Failed to load note';
      },
    });
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

  protected addBlock(type: ContentBlock['type']): void {
    this.contentBlocks.push(this.createBlockGroup(type));
  }

  protected removeBlock(index: number): void {
    this.contentBlocks.removeAt(index);
    delete this.fullscreenFontSizes[index];
    const keys = Object.keys(this.fullscreenFontSizes).map(Number);
    for (const k of keys) {
      if (k > index) {
        this.fullscreenFontSizes[k - 1] = this.fullscreenFontSizes[k];
        delete this.fullscreenFontSizes[k];
      }
    }
    if (this.fullscreenBlockIndex === index) {
      this.closeFullscreenBlock();
    } else if (this.fullscreenBlockIndex !== null && this.fullscreenBlockIndex > index) {
      this.fullscreenBlockIndex -= 1;
    }
  }

  protected moveBlock(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.contentBlocks.length) return;

    const arr = this.contentBlocks;
    const min = Math.min(index, target);
    const max = Math.max(index, target);

    const lowerGroup = arr.at(min);
    const upperGroup = arr.at(max);

    arr.removeAt(max);
    arr.removeAt(min);

    arr.insert(min, upperGroup);
    arr.insert(max, lowerGroup);

    if (this.fullscreenBlockIndex === index) {
      this.fullscreenBlockIndex = target;
    } else if (this.fullscreenBlockIndex === target) {
      this.fullscreenBlockIndex = index;
    }

    const tempSize = this.fullscreenFontSizes[index];
    this.fullscreenFontSizes[index] = this.fullscreenFontSizes[target];
    this.fullscreenFontSizes[target] = tempSize;
  }

  protected selectCategory(catId: string): void {
    this.form.patchValue({ category_id: catId });
  }

  protected canUseFullscreen(type: ContentBlock['type'] | undefined): boolean {
    return type === 'text' || type === 'code';
  }

  protected isFullscreenBlock(index: number): boolean {
    return this.fullscreenBlockIndex === index;
  }

  protected openFullscreenBlock(index: number): void {
    this.fullscreenBlockIndex = index;
  }

  protected closeFullscreenBlock(): void {
    if (this.fullscreenBlockIndex !== null) {
      delete this.fullscreenFontSizes[this.fullscreenBlockIndex];
    }
    this.fullscreenBlockIndex = null;
  }

  protected onCodeChange(blockIndex: number, code: string): void {
    const block = this.contentBlocks.at(blockIndex);
    block.get('code')?.setValue(code, { emitEvent: false });
  }

  protected clearBlock(index: number): void {
    const block = this.contentBlocks.at(index);
    const type = block.value.type;
    if (type === 'text') {
      block.get('content')?.setValue('');
    } else if (type === 'code') {
      block.get('code')?.setValue('');
    }
  }

  protected submitLabel(): string {
    if (this.submitting) return 'Saving...';
    return this.isEditing ? 'Update Note' : 'Save Note';
  }

  private buildPayload(): { payload: CreateNotePayload; contentBlocks: ContentBlock[] } {
    const raw = this.form.value;
    const contentBlocks = ((raw.content_blocks ?? []) as ContentBlock[]).filter((b) => {
      if (b.type === 'text') return b.content?.trim();
      if (b.type === 'code') return b.code?.trim();
      if (b.type === 'link') return b.url?.trim();
      return false;
    });

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

    const payload: CreateNotePayload = {
      title: raw.title!,
      category_id: raw.category_id!,
      description: description || undefined,
      code_snippets: codeSnippets,
      links: links,
      content_blocks: contentBlocks,
      confidence_level: (raw.confidence_level as ConfidenceLevel) || 'need_practice',
    };

    return { payload, contentBlocks };
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.error = '';

    const { payload } = this.buildPayload();

    const obs = this.isEditing && this.noteId
      ? this.notesService.update(this.noteId, payload)
      : this.notesService.create(payload);

    obs.subscribe({
      next: (note) => {
        this.router.navigate(['/notes', note.id]);
      },
      error: (err) => {
        this.submitting = false;
        this.error = err.message || 'Failed to save note';
      },
    });
  }

  protected submitInFullscreen(): void {
    this.closeFullscreenBlock();
  }

  protected goBack(): void {
    if (this.noteId) {
      this.router.navigate(['/notes', this.noteId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
