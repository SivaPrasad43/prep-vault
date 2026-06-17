import { Injectable } from '@angular/core';
import { from, Observable, combineLatest, forkJoin, of } from 'rxjs';
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

    if (filters?.searchQuery) {
      const q = filters.searchQuery;
      query = query.or(`title.ilike.*${q}*,description.ilike.*${q}*`);
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
        .or(`title.ilike.*${query}*,description.ilike.*${query}*`)
        .order('updated_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
    );
  }

  getStreak(): Observable<number> {
    const userId = this.auth.userId;
    if (!userId) return of(0);

    return from(
      this.supabase.client
        .from('notes')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data || data.length === 0) return 0;

        const dates = data.map((d) => {
          const date = new Date(d.created_at);
          return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        });

        const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();
        const msInDay = 24 * 60 * 60 * 1000;

        const diff = (todayMs - uniqueDates[0]) / msInDay;
        if (diff > 1) return 0;

        let streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          if (Math.round((uniqueDates[i - 1] - uniqueDates[i]) / msInDay) === 1) {
            streak++;
          } else {
            break;
          }
        }

        return streak;
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
