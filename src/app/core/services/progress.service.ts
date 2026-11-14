import { Injectable, inject } from '@angular/core';
import { forkJoin, from, map, type Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { StatNote, StatRevision } from '../../shared/study-stats';

export interface ProgressData {
  notes: StatNote[];
  revisions: StatRevision[];
}

/** Raw rows for the Progress page; all maths lives in shared/study-stats.ts. */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  load(): Observable<ProgressData> {
    const userId = this.auth.userId;
    const notes$ = from(
      this.supabase.client
        .from('notes')
        .select('id, title, category_id, confidence_level, created_at')
        .eq('user_id', userId),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as StatNote[];
      }),
    );
    const revisions$ = from(
      this.supabase.client.from('revisions').select('note_id, revised_at').eq('user_id', userId),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as StatRevision[];
      }),
    );
    return forkJoin({ notes: notes$, revisions: revisions$ });
  }
}
