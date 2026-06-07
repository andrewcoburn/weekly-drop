-- ============================================================
-- Weekly Drop — Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

create or replace function generate_invite_code()
returns text as $$
  select upper(substring(encode(gen_random_bytes(5), 'hex') from 1 for 8));
$$ language sql volatile;

-- ============================================================
-- TABLES
-- ============================================================

-- Users (extends auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cover_photo_url text,
  submission_day smallint not null check (submission_day between 0 and 6),
  timezone text not null default 'UTC',
  invite_code text unique not null default generate_invite_code(),
  created_by uuid references public.users(id),
  captain_index integer not null default 0,
  created_at timestamptz default now() not null
);

-- Group members
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now() not null,
  unique(group_id, user_id)
);

-- Weekly cycles
create table if not exists public.weekly_cycles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  week_start date not null,
  deadline_at timestamptz not null,
  captain_id uuid references public.users(id),
  caption text,
  song text,
  status text not null default 'pending'
    check (status in ('pending', 'captain_set', 'mutiny', 'published')),
  mutiny_captions jsonb,
  created_at timestamptz default now() not null,
  unique(group_id, week_start)
);

-- Submissions (one per user per cycle)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.weekly_cycles(id) on delete cascade,
  user_id uuid not null references public.users(id),
  media_url text not null,       -- storage path (not public URL)
  media_type text not null check (media_type in ('photo', 'video')),
  thumbnail_url text,            -- storage path for video thumbnail
  private_note text,
  submitted_at timestamptz default now() not null,
  unique(cycle_id, user_id)
);

-- Caption votes (mutiny mode only)
create table if not exists public.caption_votes (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.weekly_cycles(id) on delete cascade,
  user_id uuid not null references public.users(id),
  caption_option smallint not null check (caption_option between 0 and 2),
  voted_at timestamptz default now() not null,
  unique(cycle_id, user_id)
);

-- Vault posts (published weekly posts)
create table if not exists public.vault_posts (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.weekly_cycles(id),
  group_id uuid not null references public.groups(id) on delete cascade,
  published_at timestamptz default now() not null,
  final_caption text not null,
  final_song text,
  photo_order jsonb not null default '[]'::jsonb  -- ordered array of submission IDs
);

-- In-app notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  type text not null check (type in ('captain_selected', 'reminder', 'post_published', 'mutiny')),
  message text not null,
  read boolean not null default false,
  created_at timestamptz default now() not null
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_weekly_cycles_group on public.weekly_cycles(group_id);
create index if not exists idx_weekly_cycles_deadline on public.weekly_cycles(deadline_at);
create index if not exists idx_submissions_cycle on public.submissions(cycle_id);
create index if not exists idx_submissions_user on public.submissions(user_id);
create index if not exists idx_vault_posts_group on public.vault_posts(group_id);
create index if not exists idx_notifications_user on public.notifications(user_id, read, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.weekly_cycles enable row level security;
alter table public.submissions enable row level security;
alter table public.caption_votes enable row level security;
alter table public.vault_posts enable row level security;
alter table public.notifications enable row level security;

-- Helper: is the calling user a member of this group?
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

-- users
create policy "users_select" on public.users for select using (
  id = auth.uid() or
  exists (
    select 1 from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = users.id
  )
);
create policy "users_insert" on public.users for insert with check (id = auth.uid());
create policy "users_update" on public.users for update using (id = auth.uid());

-- groups
create policy "groups_select" on public.groups for select using (public.is_group_member(id));
create policy "groups_insert" on public.groups for insert with check (auth.uid() = created_by);
create policy "groups_update" on public.groups for update using (public.is_group_member(id));

-- group_members
create policy "group_members_select" on public.group_members for select using (public.is_group_member(group_id));
create policy "group_members_insert" on public.group_members for insert with check (auth.uid() = user_id);
create policy "group_members_delete" on public.group_members for delete using (user_id = auth.uid());

-- weekly_cycles
create policy "weekly_cycles_select" on public.weekly_cycles for select using (public.is_group_member(group_id));
create policy "weekly_cycles_insert" on public.weekly_cycles for insert with check (public.is_group_member(group_id));
create policy "weekly_cycles_update" on public.weekly_cycles for update using (public.is_group_member(group_id));

-- submissions: group members can see rows but media paths are resolved app-side
create policy "submissions_select" on public.submissions for select using (
  exists (
    select 1 from public.weekly_cycles wc
    where wc.id = submissions.cycle_id and public.is_group_member(wc.group_id)
  )
);
create policy "submissions_insert" on public.submissions for insert with check (
  auth.uid() = user_id and
  exists (
    select 1 from public.weekly_cycles wc
    where wc.id = submissions.cycle_id and public.is_group_member(wc.group_id)
  )
);

-- caption_votes
create policy "caption_votes_select" on public.caption_votes for select using (
  exists (
    select 1 from public.weekly_cycles wc
    where wc.id = caption_votes.cycle_id and public.is_group_member(wc.group_id)
  )
);
create policy "caption_votes_insert" on public.caption_votes for insert with check (
  auth.uid() = user_id and
  exists (
    select 1 from public.weekly_cycles wc
    where wc.id = caption_votes.cycle_id and public.is_group_member(wc.group_id)
  )
);

-- vault_posts
create policy "vault_posts_select" on public.vault_posts for select using (public.is_group_member(group_id));
create policy "vault_posts_insert" on public.vault_posts for insert with check (public.is_group_member(group_id));

-- notifications: own only
create policy "notifications_select" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_insert" on public.notifications for insert with check (true);
create policy "notifications_update" on public.notifications for update using (user_id = auth.uid());

-- ============================================================
-- TRIGGER: auto-create user profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer as $$
begin
  insert into public.users (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STORAGE BUCKETS (run separately or in Supabase dashboard)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('group-covers', 'group-covers', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('submissions', 'submissions', false) on conflict do nothing;
