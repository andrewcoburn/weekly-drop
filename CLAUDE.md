@AGENTS.md

# Weekly Drop — Project Memory

## Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (CSS-first config in globals.css — no tailwind.config.ts)
- **Backend/DB**: Supabase (Postgres)
- **Auth**: Supabase Auth (magic link / email)
- **Storage**: Supabase Storage (avatars, group-covers, submissions buckets)
- **AI**: Anthropic Claude API — model `claude-sonnet-4-20250514`
- **Hosting**: Vercel (cron every 15 min for publish check)

## Key Architectural Decisions
- `params` and `searchParams` in pages/layouts are **Promises** (Next.js 16) — always `await params`
- `cookies()` is async — always `await cookies()`
- Tailwind v4: custom colors defined in `app/globals.css` under `@theme`, no config file
- Media URLs in `submissions` table are **storage paths**, not public URLs. Generate signed URLs in the app layer with these rules:
  - Own submission: always visible
  - Captain of that cycle: visible during submission window
  - Everyone: visible after cycle is `published`
- Timezone: stored as IANA string on `groups.timezone`. Deadline = `week_end` date at 23:59:59 in that timezone, stored as `deadline_at timestamptz` on `weekly_cycles`
- Captain rotation: round-robin by `joined_at` order. `groups.captain_index` tracks the next captain slot

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

## Database Tables
- `users` — mirrors auth.users (id, name, avatar_url)
- `groups` — (name, cover_photo_url, submission_day, timezone, invite_code, created_by, captain_index)
- `group_members` — (group_id, user_id, role)
- `weekly_cycles` — (group_id, week_start, deadline_at, captain_id, caption, song, status, mutiny_captions)
- `submissions` — (cycle_id, user_id, media_url, media_type, thumbnail_url, private_note)
- `caption_votes` — (cycle_id, user_id, caption_option 0|1|2)
- `vault_posts` — (cycle_id, group_id, final_caption, final_song, photo_order jsonb)
- `notifications` — (user_id, group_id, type, message, read)

## Cycle Status Flow
`pending` → (captain submits) → `captain_set` → (deadline) → `published`
`pending` → (deadline, captain didn't submit) → `mutiny` → (votes tallied) → `published`

## Current Phase
**Phase 1 MVP** — all core features

## Intentionally Deferred (Phase 2)
- Instagram/TikTok/X auto-publishing
- Streaks, badges, leaderboards
- AI yearly recaps
- Firebase push notifications (in-app only now)
- Native iOS/Android app (PWA only now)
- Spotify/Apple Music integration (text input only now)

## Supabase Storage Buckets (create manually)
- `avatars` — public
- `group-covers` — public
- `submissions` — private (signed URLs only)

## Cron Job
Vercel cron runs `/api/publish` every 15 minutes.
Auth: `Authorization: Bearer ${CRON_SECRET}` header.
