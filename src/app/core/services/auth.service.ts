import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { from, Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, shareReplay, catchError, filter, first, switchMap } from 'rxjs/operators';
import type { User, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import type { UserProfile, AuthState } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private static readonly LAST_ACTIVE_KEY = 'prep-vault-last-active';
  private static readonly INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  private authState = new BehaviorSubject<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  readonly authState$ = this.authState.asObservable();
  readonly user$ = this.authState$.pipe(map((s) => s.user), shareReplay(1));
  readonly isAuthenticated$ = this.authState$.pipe(
    map((s) => s.user !== null),
  );

  constructor(
    private supabase: SupabaseService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeAuth();
    } else {
      this.authState.next({ user: null, session: null, loading: false });
    }
  }

  private initializeAuth(): void {
    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.setAuthState(session);
    });

    this.supabase.client.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          this.setAuthState(null);
          return;
        }

        return this.applyInitialSession(session);
      })
      .catch((error: unknown) => {
        this.handleAuthInitializationError(error);
      });
  }

  private async applyInitialSession(session: Session | null): Promise<void> {
    if (!session) {
      this.setAuthState(null);
      return;
    }

    if (this.isExpired()) {
      this.clearLastActive();
      this.setAuthState(null);

      const { error } = await this.supabase.client.auth.signOut();
      if (error) {
        throw error;
      }

      return;
    }

    this.setLastActive();
    this.setAuthState(session);
  }

  private handleAuthInitializationError(_error: unknown): void {
    this.setAuthState(null);
  }

  validateSession(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(false);
    }
    return this.authState$.pipe(
      filter((s) => !s.loading),
      first(),
      switchMap(() => {
        const session = this.authState.value.session;
        if (!session) {
          return of(false);
        }
        if (this.isExpired()) {
          return from(this.supabase.client.auth.signOut()).pipe(
            map(() => {
              this.setAuthState(null);
              this.clearLastActive();
              return false;
            }),
            catchError(() => of(false)),
          );
        }
        this.setLastActive();
        return of(true);
      }),
    );
  }

  private isExpired(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const lastActive = localStorage.getItem(AuthService.LAST_ACTIVE_KEY);
    if (!lastActive) return false;
    return Date.now() - parseInt(lastActive, 10) > AuthService.INACTIVITY_MS;
  }

  private setLastActive(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AuthService.LAST_ACTIVE_KEY, String(Date.now()));
    }
  }

  private clearLastActive(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AuthService.LAST_ACTIVE_KEY);
    }
  }

  get userId(): string | null {
    return this.authState.value.user?.id ?? null;
  }

  get user(): UserProfile | null {
    return this.authState.value.user;
  }

  private setAuthState(session: Session | null): void {
    if (session?.user) {
      const profile: UserProfile = {
        id: session.user.id,
        email: session.user.email ?? '',
        display_name: session.user.user_metadata?.['display_name'],
        avatar_url: session.user.user_metadata?.['avatar_url'],
        created_at: session.user.created_at,
      };
      this.authState.next({ user: profile, session, loading: false });
    } else {
      this.authState.next({ user: null, session: null, loading: false });
    }
  }

  signUp(email: string, password: string): Observable<{ user: User | null; session: Session | null }> {
    return from(
      this.supabase.client.auth.signUp({ email, password }),
    ).pipe(map(({ data, error }) => {
      if (error) throw error;
      return { user: data.user, session: data.session };
    }));
  }

  signIn(email: string, password: string): Observable<{ user: User | null; session: Session | null }> {
    return from(
      this.supabase.client.auth.signInWithPassword({ email, password }),
    ).pipe(
      tap(() => this.setLastActive()),
      map(({ data, error }) => {
        if (error) throw error;
        return { user: data.user, session: data.session };
      }),
    );
  }

  signOut(): Observable<void> {
    return from(this.supabase.client.auth.signOut()).pipe(
      tap(() => this.clearLastActive()),
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }
}
