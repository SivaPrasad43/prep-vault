import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private _client: SupabaseClient | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this._client = createClient(
        environment.supabaseUrl,
        environment.supabaseAnonKey,
      );
    }
  }

  get client(): SupabaseClient {
    if (!this._client) {
      throw new Error('Supabase client is not available on the server');
    }
    return this._client;
  }

  get isReady(): boolean {
    return this._client !== null;
  }
}
