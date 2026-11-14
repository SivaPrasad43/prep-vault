import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, switchMap, shareReplay, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { Category } from '../models';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private defaultCategories: { name: string; icon: string; color: string; sort_order: number }[] = [
    { name: 'Languages', icon: 'languages', color: '#4f6ef7', sort_order: 1 },
    { name: 'Coding & Problem Solving', icon: 'code-2', color: '#34d399', sort_order: 2 },
    { name: 'System Design', icon: 'layers', color: '#f59e0b', sort_order: 3 },
    { name: 'Interview Questions', icon: 'target', color: '#8b5cf6', sort_order: 4 },
    { name: 'Resources & Links', icon: 'book-open', color: '#06b6d4', sort_order: 6 },
    { name: 'Random / Misc', icon: 'pin', color: '#6b7280', sort_order: 7 },
  ];

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
  ) {}

  getAll(): Observable<Category[]> {
    return from(
      this.supabase.client
        .from('categories')
        .select('*')
        .eq('user_id', this.auth.userId)
        .order('sort_order'),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
    );
  }

  getById(id: string): Observable<Category> {
    return from(
      this.supabase.client
        .from('categories')
        .select('*')
        .eq('id', id)
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    );
  }

  private seeded: { userId: string | null; result$: Observable<Category[]> } | null = null;

  /**
   * Returns the user's categories, inserting the defaults on first use.
   * Memoized per user so concurrent callers (layout rail + dashboard) don't
   * both try to insert the defaults for a brand-new account.
   */
  seedDefaults(): Observable<Category[]> {
    const userId = this.auth.userId;
    if (this.seeded?.userId === userId) {
      return this.seeded.result$;
    }
    const result$ = this.loadOrSeed().pipe(
      catchError((err) => {
        this.seeded = null; // allow retry after a failure
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.seeded = { userId, result$ };
    return result$;
  }

  private loadOrSeed(): Observable<Category[]> {
    return from(
      this.supabase.client
        .from('categories')
        .select('id')
        .eq('user_id', this.auth.userId)
        .limit(1),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      switchMap((existing) => {
        if (existing && existing.length > 0) {
          return this.getAll();
        }
        const inserts = this.defaultCategories.map((c) => ({
          ...c,
          user_id: this.auth.userId,
        }));
        return from(
          this.supabase.client.from('categories').insert(inserts).select(),
        ).pipe(
          map(({ data, error }) => {
            if (error) throw error;
            return data ?? [];
          }),
        );
      }),
    );
  }
}
