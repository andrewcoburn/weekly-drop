-- ============================================================
-- Weekly Drop — Phase 2: Instagram Connections
-- Run this in the Supabase SQL editor AFTER the base schema
-- ============================================================

-- One Instagram Business/Creator account per group
create table if not exists public.instagram_connections (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null unique references public.groups(id) on delete cascade,
  ig_user_id text not null,
  ig_username text not null,
  access_token text not null,  -- long-lived Page access token (~60 days)
  token_expires_at timestamptz,
  connected_by uuid references public.users(id),
  connected_at timestamptz default now() not null
);

-- Track which vault posts were auto-posted to Instagram
alter table public.vault_posts
  add column if not exists instagram_post_id text,
  add column if not exists instagram_auto_posted boolean not null default false;

-- RLS
alter table public.instagram_connections enable row level security;

-- Members can see connection status (username, connected_at) but not the token
-- Token is only accessed server-side via service role
create policy "instagram_connections_select" on public.instagram_connections
  for select using (public.is_group_member(group_id));

-- Only group admins can insert/update/delete
create policy "instagram_connections_insert" on public.instagram_connections
  for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = instagram_connections.group_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

create policy "instagram_connections_update" on public.instagram_connections
  for update using (
    exists (
      select 1 from public.group_members
      where group_id = instagram_connections.group_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

create policy "instagram_connections_delete" on public.instagram_connections
  for delete using (
    exists (
      select 1 from public.group_members
      where group_id = instagram_connections.group_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );
