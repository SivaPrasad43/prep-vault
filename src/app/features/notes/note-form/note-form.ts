import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideArrowLeft, LucidePlus, LucideX } from '@lucide/angular';
import { NotesService } from '../../../core/services/notes.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { TagsService } from '../../../core/services/tags.service';
import type { Category, Tag, Note, CreateNotePayload, ConfidenceLevel } from '../../../core/models';

@Component({
  selector: 'app-note-form',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, LucideArrowLeft, LucidePlus, LucideX],
  templateUrl: './note-form.html',
  styleUrl: './note-form.scss',
})
export class NoteForm implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notesService = inject(NotesService);
  private categoriesService = inject(CategoriesService);
  private tagsService = inject(TagsService);

  protected categories: Category[] = [];
  protected tags: Tag[] = [];
  protected selectedTagIds: string[] = [];
  protected isEditing = false;
  private noteId: string | null = null;
  protected loading = false;
  protected submitting = false;
  protected error = '';
  protected showNewCategory = false;
  protected newCategoryName = '';

  protected readonly confidenceLevels: { value: ConfidenceLevel; label: string }[] = [
    { value: 'need_practice', label: 'Need Practice' },
    { value: 'getting_there', label: 'Getting There' },
    { value: 'confident', label: 'Confident' },
  ];

  protected form = this.fb.group({
    title: ['', Validators.required],
    category_id: ['', Validators.required],
    description: [''],
    confidence_level: ['need_practice' as ConfidenceLevel],
    is_favorite: [false],
    is_pinned: [false],
    code_snippets: this.fb.array([]),
    links: this.fb.array([]),
  });

  get codeSnippets(): FormArray {
    return this.form.get('code_snippets') as FormArray;
  }

  get links(): FormArray {
    return this.form.get('links') as FormArray;
  }

  ngOnInit(): void {
    this.loading = true;
    this.loadCategories();
    this.loadTags();

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
      },
    });
  }

  private loadTags(): void {
    this.tagsService.getAll().subscribe({
      next: (ts) => {
        this.tags = ts;
      },
    });
  }

  private loadNote(id: string): void {
    this.notesService.getById(id).subscribe({
      next: (note) => {
        this.form.patchValue({
          title: note.title,
          category_id: note.category_id,
          description: note.description ?? '',
          confidence_level: note.confidence_level,
          is_favorite: note.is_favorite,
          is_pinned: note.is_pinned,
        });

        for (const snippet of note.code_snippets ?? []) {
          this.codeSnippets.push(this.fb.group({
            language: [snippet.language],
            code: [snippet.code],
            filename: [snippet.filename ?? ''],
          }));
        }

        for (const link of note.links ?? []) {
          this.links.push(this.fb.group({
            label: [link.label],
            url: [link.url],
          }));
        }

        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load note';
        this.loading = false;
      },
    });
  }

  protected addSnippet(): void {
    this.codeSnippets.push(this.fb.group({
      language: [''],
      code: [''],
      filename: [''],
    }));
  }

  protected removeSnippet(index: number): void {
    this.codeSnippets.removeAt(index);
  }

  protected addLink(): void {
    this.links.push(this.fb.group({
      label: [''],
      url: [''],
    }));
  }

  protected removeLink(index: number): void {
    this.links.removeAt(index);
  }

  protected toggleTag(tagId: string): void {
    const idx = this.selectedTagIds.indexOf(tagId);
    if (idx === -1) {
      this.selectedTagIds.push(tagId);
    } else {
      this.selectedTagIds.splice(idx, 1);
    }
  }

  protected addCategory(): void {
    if (!this.newCategoryName.trim()) return;
    const name = this.newCategoryName.trim();
    this.categoriesService.create(name, 'folder', '#6b7280').subscribe({
      next: (cat) => {
        this.categories.push(cat);
        this.form.patchValue({ category_id: cat.id });
        this.newCategoryName = '';
        this.showNewCategory = false;
      },
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.error = '';

    const raw = this.form.value;
    const code_snippets = ((raw.code_snippets ?? []) as { language?: string; code?: string; filename?: string }[])
      .filter((s) => s.code?.trim())
      .map((s) => ({ language: s.language || '', code: s.code!, filename: s.filename }));
    const links = ((raw.links ?? []) as { label?: string; url?: string }[])
      .filter((l) => l.url?.trim())
      .map((l) => ({ label: l.label || l.url!, url: l.url! }));
    const payload: CreateNotePayload = {
      title: raw.title!,
      category_id: raw.category_id!,
      description: raw.description || undefined,
      code_snippets,
      links,
      confidence_level: (raw.confidence_level as ConfidenceLevel) || 'need_practice',
      is_favorite: raw.is_favorite ?? false,
      is_pinned: raw.is_pinned ?? false,
    };

    const obs = this.isEditing && this.noteId
      ? this.notesService.update(this.noteId, payload)
      : this.notesService.create(payload);

    obs.subscribe({
      next: (note) => {
        if (this.selectedTagIds.length > 0) {
          this.tagsService.setNoteTags(note.id, this.selectedTagIds).subscribe({
            next: () => this.router.navigate(['/notes', note.id]),
          });
        } else {
          this.router.navigate(['/notes', note.id]);
        }
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
