import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  LucideArrowLeft, LucideX, LucideChevronDown,
  LucideMoveUp, LucideMoveDown, LucideType, LucideFileCode, LucideLink,
} from '@lucide/angular';
import { CategoryIcon } from '../../../shared/components/category-icon/category-icon';
import { NotesService } from '../../../core/services/notes.service';
import { CategoriesService } from '../../../core/services/categories.service';
import type { Category, Note, CreateNotePayload, ConfidenceLevel, ContentBlock } from '../../../core/models';

@Component({
  selector: 'app-note-form',
  imports: [
    ReactiveFormsModule,
    LucideArrowLeft, LucideX, LucideChevronDown,
    LucideMoveUp, LucideMoveDown, LucideType, LucideFileCode, LucideLink,
    CategoryIcon,
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
    is_favorite: [false],
    is_pinned: [false],
    content_blocks: this.fb.array<ReturnType<typeof this.createBlockGroup>>([]),
  });

  get contentBlocks(): FormArray {
    return this.form.get('content_blocks') as FormArray;
  }

  private createBlockGroup(type: ContentBlock['type'] = 'text') {
    switch (type) {
      case 'code':
        return this.fb.group({
          type: ['code' as const],
          language: [''],
          code: [''],
          filename: [''],
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
    console.log("id is:",id)
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
          is_favorite: note.is_favorite,
          is_pinned: note.is_pinned,
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
  }

  protected moveBlock(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.contentBlocks.length) return;
    const arr = this.contentBlocks;
    const current = arr.at(index) as ReturnType<typeof this.createBlockGroup>;
    const adjacent = arr.at(target) as ReturnType<typeof this.createBlockGroup>;
    const currentVal = current.value;
    const adjacentVal = adjacent.value;
    current.patchValue(adjacentVal as never);
    adjacent.patchValue(currentVal as never);
  }

  protected selectCategory(catId: string): void {
    this.form.patchValue({ category_id: catId });
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.error = '';

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
      .filter((b): b is { type: 'code'; language: string; code: string; filename?: string } => b.type === 'code')
      .map((b) => ({ language: b.language || '', code: b.code, filename: b.filename }));

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
      is_favorite: raw.is_favorite ?? false,
      is_pinned: raw.is_pinned ?? false,
    };

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

  protected goBack(): void {
    if (this.noteId) {
      this.router.navigate(['/notes', this.noteId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
