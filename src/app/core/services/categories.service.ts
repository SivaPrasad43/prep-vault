import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
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
    { name: 'Company-Specific Prep', icon: 'building', color: '#ec4899', sort_order: 5 },
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

  create(name: string, icon: string, color: string): Observable<Category> {
    return from(
      this.supabase.client
        .from('categories')
        .insert({ name, icon, color, user_id: this.auth.userId })
        .select()
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    );
  }

  update(id: string, payload: Partial<Category>): Observable<Category> {
    return from(
      this.supabase.client
        .from('categories')
        .update(payload)
        .eq('id', id)
        .select()
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    );
  }

  delete(id: string): Observable<void> {
    return from(
      this.supabase.client.from('categories').delete().eq('id', id),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  seedDefaults(): Observable<Category[]> {
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
