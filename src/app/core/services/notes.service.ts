import { Injectable } from '@angular/core';
import { from, Observable, combineLatest, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { RevisionsService } from './revisions.service';
import type { Note, CreateNotePayload, UpdateNotePayload, NoteFilters, NoteStats } from '../models';

@Injectable({ providedIn: 'root' })
export class NotesService {
  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
    private revisions: RevisionsService,
  ) {}

  getAll(filters?: NoteFilters): Observable<Note[]> {
    let query = this.supabase.client
      .from('notes')
      .select('*')
      .eq('user_id', this.auth.userId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.confidenceLevel) {
      query = query.eq('confidence_level', filters.confidenceLevel);
    }

    if (filters?.smartFilter === 'favorites') {
      query = query.eq('is_favorite', true);
    }

    if (filters?.smartFilter === 'pinned') {
      query = query.eq('is_pinned', true);
    }

    if (filters?.smartFilter === 'recently_added') {
      query = query.order('created_at', { ascending: false });
    }

    if (filters?.searchQuery) {
      const q = filters.searchQuery;
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,code_snippets::text.ilike.%${q}%`);
    }

    if (filters?.sortBy === 'title') {
      query = query.order('title', { ascending: true });
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
    );
  }

  getById(id: string): Observable<Note> {
    return from(
      this.supabase.client
        .from('notes')
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

  create(payload: CreateNotePayload): Observable<Note> {
    return from(
      this.supabase.client
        .from('notes')
        .insert({ ...payload, user_id: this.auth.userId })
        .select()
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    );
  }

  update(id: string, payload: UpdateNotePayload): Observable<Note> {
    return from(
      this.supabase.client
        .from('notes')
        .update({ ...payload, updated_at: new Date().toISOString() })
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
      this.supabase.client.from('notes').delete().eq('id', id),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  search(query: string): Observable<Note[]> {
    return from(
      this.supabase.client
        .from('notes')
        .select('*')
        .eq('user_id', this.auth.userId)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,code_snippets::text.ilike.%${query}%`)
        .order('updated_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
    );
  }

  getStats(): Observable<NoteStats> {
    return forkJoin([
      from(
        this.supabase.client
          .from('notes')
          .select('confidence_level')
          .eq('user_id', this.auth.userId),
      ),
      this.revisions.getTodayCount(),
    ]).pipe(
      map(([{ data, error }, revisedToday]) => {
        if (error) throw error;
        const notes = data ?? [];
        const total = notes.length;
        const needPractice = notes.filter((n) => n.confidence_level === 'need_practice').length;
        const gettingThere = notes.filter((n) => n.confidence_level === 'getting_there').length;
        const confident = notes.filter((n) => n.confidence_level === 'confident').length;
        return { total, revisedToday, confident, needPractice, gettingThere };
      }),
    );
  }

}
