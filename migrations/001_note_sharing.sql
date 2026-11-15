-- Public read-only share links for notes.
-- Run once in the Supabase SQL Editor (after 000_init.sql).
--
-- Security model:
--   * Anonymous users still have NO select access to public.notes (no new RLS policy),
--     so notes can't be listed or browsed.
--   * get_shared_note() is SECURITY DEFINER and returns only the public fields of the
--     single note whose secret share_token matches. Tokens are ~190-bit random strings.
--   * The owner sets/clears share_token through the existing owner-only UPDATE policy.

alter table public.notes add column if not exists share_token text unique;
alter table public.notes add column if not exists shared_at timestamptz;

create or replace function public.get_shared_note(p_token text)
returns table (title text, body_markdown text, updated_at timestamptz, author_name text)
language sql
stable
security definer
set search_path = public
as $$
  select n.title,
         n.body_markdown,
         n.updated_at,
         coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name') as author_name
  from public.notes n
  join auth.users u on u.id = n.user_id
  where p_token is not null
    and length(p_token) >= 24
    and n.share_token = p_token
  limit 1;
$$;

revoke all on function public.get_shared_note(text) from public;
grant execute on function public.get_shared_note(text) to anon, authenticated;
