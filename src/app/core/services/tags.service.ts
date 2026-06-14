import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { Tag } from '../models';

@Injectable({ providedIn: 'root' })
export class TagsService {
  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
  ) {}

  getAll(): Observable<Tag[]> {
    return from(
      this.supabase.client
        .from('tags')
        .select('*, note_tags(count)')
        .eq('user_id', this.auth.userId)
        .order('name'),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((t) => ({
          ...t,
          note_count: (t as unknown as { note_tags: { count: number }[] }).note_tags?.[0]?.count ?? 0,
        }));
      }),
    );
  }

  getByNoteId(noteId: string): Observable<Tag[]> {
    return from(
      this.supabase.client
        .from('tags')
        .select('*, note_tags!inner(*)')
        .eq('note_tags.note_id', noteId),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
    );
  }

  create(name: string, color = '#6b7280'): Observable<Tag> {
    return from(
      this.supabase.client
        .from('tags')
        .insert({ name, color, user_id: this.auth.userId })
        .select()
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    );
  }

  update(id: string, payload: Partial<Tag>): Observable<Tag> {
    return from(
      this.supabase.client
        .from('tags')
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
      this.supabase.client
        .from('tags')
        .delete()
        .eq('id', id),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  attachToNote(tagId: string, noteId: string): Observable<void> {
    return from(
      this.supabase.client
        .from('note_tags')
        .insert({ tag_id: tagId, note_id: noteId }),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  detachFromNote(tagId: string, noteId: string): Observable<void> {
    return from(
      this.supabase.client
        .from('note_tags')
        .delete()
        .eq('tag_id', tagId)
        .eq('note_id', noteId),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  setNoteTags(noteId: string, tagIds: string[]): Observable<void> {
    return from(
      this.supabase.client
        .from('note_tags')
        .delete()
        .eq('note_id', noteId),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
      map(() => {
        if (tagIds.length === 0) return;
        return from(
          this.supabase.client
            .from('note_tags')
            .insert(tagIds.map((tagId) => ({ tag_id: tagId, note_id: noteId }))),
        ).pipe(
          map(({ error }) => {
            if (error) throw error;
          }),
        );
      }),
    ) as unknown as Observable<void>;
  }
}
