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

The app uses Supabase Auth (email/password) and expects these tables:

### `notes`

Created automatically by the app on first sign-in (RLS policies must allow insert). Schema managed via the `NotesService`.

### `categories`

Auto-seeded with 7 default categories on first use via `CategoriesService.seedDefaults()`. Columns: `id`, `name`, `icon`, `color`, `sort_order`, `user_id`.

### `tags`

Created manually or via the app. Columns: `id`, `name`, `color`, `user_id`.

### `note_tags`

Junction table linking notes to tags. Columns: `id`, `note_id`, `tag_id`.

### All tables

Run `migrations/000_init.sql` in the Supabase SQL Editor. This creates all tables in dependency order:

- `notes` — core note storage with JSONB for code snippets and links
- `categories` — per-user categories
- `tags` — per-user tags
- `note_tags` — many-to-many junction
- `revisions` — revision history for spaced repetition

Each table has RLS policies enforcing user isolation (`user_id = auth.uid()`).

### `attachments` (not used)

`migrations/002_attachments.sql` exists but is not wired in the app.

## RLS Policies

Every table has Row Level Security enabled. Policies ensure users can only access their own data (`user_id = auth.uid()`).

## Auth

- **Login only** — email/password sign-in via `AuthService.signIn()`.
- No signup UI; new users must be created in the Supabase Dashboard (Authentication > Users).
- `AuthGuard` protects all routes except `/auth`.

## Client Setup

`SupabaseService` creates the client lazily on the browser only (`isPlatformBrowser` guard for SSR). Services inject `SupabaseService` and use `this.supabase.client` for all queries.

## Quick Start

1. Create a Supabase project
2. Copy URL + anon key to `src/environments/environment.ts`
3. Run `migrations/000_init.sql` in Supabase SQL Editor (creates all tables)
4. Enable email/password auth in Supabase Dashboard (Authentication > Providers)
5. Create a test user in Supabase Dashboard (Authentication > Users > Add User)
6. Run `ng serve` and sign in
