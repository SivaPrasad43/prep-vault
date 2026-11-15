# Supabase Configuration

## Credentials

Set in `src/environments/environment.ts`:

```ts
export const environment = {
  production: true,
  supabaseUrl: 'https://<project>.supabase.co',
  supabaseAnonKey: '<anon-key>',
};
```

## Tables

The app uses Supabase Auth (Google OAuth) and expects these tables:

### `notes`

Created automatically by the app on first sign-in (RLS policies must allow insert). Schema managed via the `NotesService`.

### `categories`

Auto-seeded with 7 default categories on first use via `CategoriesService.seedDefaults()`. Columns: `id`, `name`, `icon`, `color`, `sort_order`, `user_id`.

### `revisions`

Revision history for spaced repetition. Columns: `id`, `note_id`, `user_id`, `revised_at`.

### All tables

Run `migrations/000_init.sql` in the Supabase SQL Editor. This creates all tables in dependency order:

- `notes` — core note storage with JSONB for content blocks, code snippets, and links
- `categories` — per-user categories
- `revisions` — revision history for spaced repetition

Each table has RLS policies enforcing user isolation (`user_id = auth.uid()`).

## Sharing (public read-only links)

Run `migrations/001_note_sharing.sql` after `000_init.sql`. It adds `notes.share_token` / `notes.shared_at` and a `get_shared_note(token)` function.

- Sharing a note stores a long random token on it; the public page `/s/<token>` calls `get_shared_note` (allowed for anonymous users) to read **only** that note's title, content, last-updated time and the author's display name.
- Anonymous users still can't query the `notes` table directly, so shared notes can't be listed or guessed.
- Stopping or resetting a share clears or replaces the token, so the old link stops working immediately.

## RLS Policies

Every table has Row Level Security enabled. Policies ensure users can only access their own data (`user_id = auth.uid()`).

## Auth

- **Google sign-in only** via `AuthService.signInWithGoogle()` (`supabase.auth.signInWithOAuth({ provider: 'google' })`).
- Any Google account can sign in; first sign-in creates the Supabase user automatically. RLS keeps each user's vault isolated, and default categories are seeded on first dashboard load.
- Existing email/password users: Supabase auto-links the Google identity when the Google email matches the existing verified email, so their notes stay attached.
- After the OAuth redirect, supabase-js reads the session from the URL and `AuthService` picks it up via `onAuthStateChange`.
- `AuthGuard` protects all routes except `/auth`.

### Google provider setup

1. Google Cloud Console > APIs & Services > Credentials > **Create OAuth client ID** (type: Web application).
   - Authorized JavaScript origins: `http://localhost:4200` and your production URL.
   - Authorized redirect URI: `https://<project>.supabase.co/auth/v1/callback`.
   - Configure the OAuth consent screen (app name, support email, scopes `email`, `profile`, `openid`) and publish it.
2. Supabase Dashboard > Authentication > **Providers > Google**: enable, paste the Client ID and Client Secret.
3. Supabase Dashboard > Authentication > **URL Configuration**:
   - Site URL: your production URL.
   - Redirect URLs: `http://localhost:4200/**` and `https://<your-prod-domain>/**`.
4. Optional: once your Google login works and your notes are visible, disable the **Email** provider.

## Client Setup

`SupabaseService` creates the client lazily on the browser only (`isPlatformBrowser` guard for SSR). Services inject `SupabaseService` and use `this.supabase.client` for all queries.

## Quick Start

1. Create a Supabase project
2. Copy URL + anon key to `src/environments/environment.ts`
3. Run `migrations/000_init.sql`, then `migrations/001_note_sharing.sql`, in the Supabase SQL Editor
4. Set up the Google provider (see **Google provider setup** above)
5. Run `ng serve` and click **Continue with Google**
