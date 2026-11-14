import { Injectable } from '@angular/core';
import { from, Observable, Subject, combineLatest, forkJoin, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { RevisionsService } from './revisions.service';
import { currentStreak, studyDays } from '../../shared/study-stats';
import type { Note, CreateNotePayload, UpdateNotePayload, NoteFilters, NoteStats } from '../models';

export type NoteChange = { type: 'upsert'; note: Note } | { type: 'delete'; id: string };

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly _changes = new Subject<NoteChange>();
  /** Emits after every successful create/update/delete so open lists can patch themselves. */
  readonly changes$ = this._changes.asObservable();

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
    private revisions: RevisionsService,
  ) {}

  getAll(filters?: NoteFilters, page: number = 1, pageSize: number = 10): Observable<{ data: Note[]; count: number }> {
    let query = this.supabase.client
      .from('notes')
      .select('*', { count: 'exact' })
      .eq('user_id', this.auth.userId)
      .order('updated_at', { ascending: false });

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.confidenceLevel) {
      query = query.eq('confidence_level', filters.confidenceLevel);
    }

    if (filters?.smartFilter === 'bookmarks') {
      query = query.eq('is_favorite', true);
    }

    if (filters?.searchQuery) {
      const q = filters.searchQuery;
      query = query.or(`title.ilike.*${q}*,description.ilike.*${q}*`);
    }

    if (filters?.sortBy === 'title') {
      query = query.order('title', { ascending: true });
    }

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;
    query = query.range(rangeFrom, rangeTo);

    return from(query).pipe(
      map(({ data, error, count }) => {
        if (error) throw error;
        return { data: data ?? [], count: count ?? 0 };
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
      tap((note) => this._changes.next({ type: 'upsert', note })),
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
      tap((note) => this._changes.next({ type: 'upsert', note })),
    );
  }

  delete(id: string): Observable<void> {
    return from(
      this.supabase.client.from('notes').delete().eq('id', id),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
      tap(() => this._changes.next({ type: 'delete', id })),
    );
  }

  search(query: string): Observable<Note[]> {
    return from(
      this.supabase.client
        .from('notes')
        .select('*')
        .eq('user_id', this.auth.userId)
        .or(`title.ilike.*${query}*,description.ilike.*${query}*`)
        .order('updated_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
    );
  }

  /** Consecutive days with study activity: a note created or any note revised. */
  getStreak(): Observable<number> {
    const userId = this.auth.userId;
    if (!userId) return of(0);

    const created$ = from(
      this.supabase.client.from('notes').select('created_at').eq('user_id', userId),
    );
    const revised$ = from(
      this.supabase.client.from('revisions').select('revised_at').eq('user_id', userId),
    );
    return forkJoin([created$, revised$]).pipe(
      map(([notes, revs]) => {
        if (notes.error) throw notes.error;
        if (revs.error) throw revs.error;
        const days = studyDays(
          (notes.data ?? []).map((n) => n.created_at as string),
          (revs.data ?? []).map((r) => r.revised_at as string),
        );
        return currentStreak(days);
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
      this.getStreak(),
    ]).pipe(
      map(([{ data, error }, revisedToday, currentStreak]) => {
        if (error) throw error;
        const notes = data ?? [];
        const total = notes.length;
        const needPractice = notes.filter((n) => n.confidence_level === 'need_practice').length;
        const gettingThere = notes.filter((n) => n.confidence_level === 'getting_there').length;
        const confident = notes.filter((n) => n.confidence_level === 'confident').length;
        return { total, revisedToday, confident, needPractice, gettingThere, currentStreak };
      }),
    );
  }

}
