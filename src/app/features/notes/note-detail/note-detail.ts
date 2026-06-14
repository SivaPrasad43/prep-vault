import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucidePencil, LucideTrash2, LucideStar, LucidePin } from '@lucide/angular';
import { NotesService } from '../../../core/services/notes.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { RevisionsService } from '../../../core/services/revisions.service';
import { CategoryBadge } from '../../../shared/components/category-badge/category-badge';
import { ConfidenceIndicator } from '../../../shared/components/confidence-indicator/confidence-indicator';
import type { Note, Category } from '../../../core/models';

@Component({
  selector: 'app-note-detail',
  imports: [DatePipe, RouterLink, LucideArrowLeft, LucidePencil, LucideTrash2, LucideStar, LucidePin, CategoryBadge, ConfidenceIndicator],
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

  protected note = signal<Note | null>(null);
  protected category = signal<Category | null>(null);
  protected showDeleteConfirm = false;
  protected loading = signal(true);
  protected deleting = false;

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
        this.cdr.detectChanges();
        this.revisionsService.log(id).subscribe();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.detectChanges();
        this.router.navigate(['/dashboard']);
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
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.deleting = false;
        this.showDeleteConfirm = false;
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
