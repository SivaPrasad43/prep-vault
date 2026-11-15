import { Injectable, computed, signal } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { map, switchMap, shareReplay, catchError, tap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { Category } from '../models';

/** Starter categories every account gets. They're locked: not renamable or deletable. */
const DEFAULT_CATEGORIES: { name: string; icon: string; color: string; sort_order: number }[] = [
  { name: 'Languages', icon: 'languages', color: '#4f6ef7', sort_order: 1 },
  { name: 'Coding & Problem Solving', icon: 'code-2', color: '#34d399', sort_order: 2 },
  { name: 'System Design', icon: 'layers', color: '#f59e0b', sort_order: 3 },
  { name: 'Interview Questions', icon: 'target', color: '#8b5cf6', sort_order: 4 },
  { name: 'Resources & Links', icon: 'book-open', color: '#06b6d4', sort_order: 6 },
  { name: 'Random / Misc', icon: 'pin', color: '#6b7280', sort_order: 7 },
];
const DEFAULT_NAMES = new Set(DEFAULT_CATEGORIES.map((c) => c.name));

/** Colours handed out to new custom categories in turn (readable in light and dark). */
const CUSTOM_COLORS = ['#68da23', '#8b5cf6', '#e2557a', '#0ea5e9', '#f97316', '#14b8a6', '#a16207', '#6366f1', '#db2777', '#16a34a'];

export const CATEGORY_NAME_MAX = 40;

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  /** The signed-in user's categories, kept in sync across every screen. */
  private readonly _list = signal<Category[]>([]);
  readonly list = this._list.asReadonly();
  readonly byId = computed(() => new Map(this._list().map((c) => [c.id, c])));

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
  ) {}

  /** Default (starter) categories are locked. */
  isDefault(category: Pick<Category, 'name'>): boolean {
    return DEFAULT_NAMES.has(category.name);
  }

  getAll(): Observable<Category[]> {
    return from(
      this.supabase.client
        .from('categories')
        .select('*')
        .eq('user_id', this.auth.userId)
        .order('sort_order')
        .order('created_at'),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as Category[];
      }),
    );
  }

  getById(id: string): Observable<Category> {
    return from(this.supabase.client.from('categories').select('*').eq('id', id).single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    );
  }

  private seeded: { userId: string | null; result$: Observable<Category[]> } | null = null;

  /**
   * Loads the user's categories (inserting the defaults on first use) into `list`.
   * Memoized per user so concurrent callers don't both insert the defaults.
   */
  seedDefaults(): Observable<Category[]> {
    const userId = this.auth.userId;
    if (this.seeded?.userId === userId) {
      return this.seeded.result$;
    }
    const result$ = this.loadOrSeed().pipe(
      tap((cats) => this._list.set(cats)),
      catchError((err) => {
        this.seeded = null; // allow retry after a failure
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.seeded = { userId, result$ };
    return result$;
  }

  /** Create a custom category; icon defaults to a folder and colour comes from the palette. */
  create(name: string, icon = 'folder'): Observable<Category> {
    const clean = name.trim().slice(0, CATEGORY_NAME_MAX);
    if (!clean) return throwError(() => new Error('Name is required'));
    if (this.nameTaken(clean)) return throwError(() => new Error('A category with that name already exists'));
    const customCount = this._list().filter((c) => !this.isDefault(c)).length;
    const maxOrder = Math.max(0, ...this._list().map((c) => c.sort_order ?? 0));
    return from(
      this.supabase.client
        .from('categories')
        .insert({
          name: clean,
          icon,
          color: CUSTOM_COLORS[customCount % CUSTOM_COLORS.length],
          sort_order: maxOrder + 1,
          user_id: this.auth.userId,
        })
        .select()
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw this.friendly(error);
        return data as Category;
      }),
      tap((cat) => this._list.update((list) => [...list, cat])),
    );
  }

  /** Rename and/or change the icon of a custom category. */
  update(id: string, changes: { name?: string; icon?: string }): Observable<Category> {
    const current = this.byId().get(id);
    if (!current) return throwError(() => new Error('Category not found'));
    if (this.isDefault(current)) return throwError(() => new Error('Default categories can’t be changed'));
    const payload: { name?: string; icon?: string } = {};
    if (changes.name !== undefined) {
      const clean = changes.name.trim().slice(0, CATEGORY_NAME_MAX);
      if (!clean) return throwError(() => new Error('Name is required'));
      if (clean.toLowerCase() !== current.name.toLowerCase() && this.nameTaken(clean)) {
        return throwError(() => new Error('A category with that name already exists'));
      }
      payload.name = clean;
    }
    if (changes.icon !== undefined) payload.icon = changes.icon;
    return from(this.supabase.client.from('categories').update(payload).eq('id', id).select().single()).pipe(
      map(({ data, error }) => {
        if (error) throw this.friendly(error);
        return data as Category;
      }),
      tap((cat) => this._list.update((list) => list.map((c) => (c.id === id ? cat : c)))),
    );
  }

  /** Number of notes in a category (for the delete dialog). */
  noteCount(id: string): Observable<number> {
    return from(
      this.supabase.client.from('notes').select('id', { count: 'exact', head: true }).eq('category_id', id),
    ).pipe(
      map(({ count, error }) => {
        if (error) throw error;
        return count ?? 0;
      }),
    );
  }

  /** Move the category's notes to `moveTo`, then delete it. */
  remove(id: string, moveTo: string): Observable<void> {
    const current = this.byId().get(id);
    if (!current) return throwError(() => new Error('Category not found'));
    if (this.isDefault(current)) return throwError(() => new Error('Default categories can’t be deleted'));
    if (moveTo === id) return throwError(() => new Error('Choose a different category for its notes'));
    return from(this.supabase.client.from('notes').update({ category_id: moveTo }).eq('category_id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
      switchMap(() => from(this.supabase.client.from('categories').delete().eq('id', id))),
      map(({ error }) => {
        if (error) throw error;
      }),
      tap(() => this._list.update((list) => list.filter((c) => c.id !== id))),
    );
  }

  private nameTaken(name: string): boolean {
    const n = name.toLowerCase();
    return this._list().some((c) => c.name.toLowerCase() === n);
  }

  private friendly(error: { code?: string; message?: string }): Error {
    if (error.code === '23505') return new Error('A category with that name already exists');
    return new Error(error.message ?? 'Something went wrong');
  }

  private loadOrSeed(): Observable<Category[]> {
    return from(
      this.supabase.client.from('categories').select('id').eq('user_id', this.auth.userId).limit(1),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      switchMap((existing) => {
        if (existing && existing.length > 0) {
          return this.getAll();
        }
        const inserts = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: this.auth.userId }));
        return from(this.supabase.client.from('categories').insert(inserts).select()).pipe(
          map(({ data, error }) => {
            if (error) throw error;
            return (data ?? []) as Category[];
          }),
        );
      }),
    );
  }
}
