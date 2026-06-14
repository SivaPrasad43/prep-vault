import { Injectable } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { Revision } from '../models';

@Injectable({ providedIn: 'root' })
export class RevisionsService {
  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
  ) {}

  log(noteId: string): Observable<Revision> {
    return from(
      this.supabase.client
        .from('revisions')
        .insert({
          note_id: noteId,
          user_id: this.auth.userId,
          revised_at: new Date().toISOString(),
        })
        .select()
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    );
  }

  getByNoteId(noteId: string): Observable<Revision[]> {
    return from(
      this.supabase.client
        .from('revisions')
        .select('*')
        .eq('note_id', noteId)
        .eq('user_id', this.auth.userId)
        .order('revised_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
    );
  }

  getRevisionCount(noteId: string): Observable<number> {
    return from(
      this.supabase.client
        .from('revisions')
        .select('id', { count: 'exact', head: true })
        .eq('note_id', noteId)
        .eq('user_id', this.auth.userId),
    ).pipe(
      map(({ count, error }) => {
        if (error) throw error;
        return count ?? 0;
      }),
    );
  }

  getTodayCount(): Observable<number> {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    return from(
      this.supabase.client
        .from('revisions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', this.auth.userId)
        .gte('revised_at', start)
        .lt('revised_at', end),
    ).pipe(
      map(({ count, error }) => {
        if (error) throw error;
        return count ?? 0;
      }),
    );
  }
}
