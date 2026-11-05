-- ═════════════════════════════════════════════════════════════════════════════
-- 001_init.sql — the whole database for the study tracker.
-- Run this ONCE in Supabase → SQL Editor → New query → paste → Run.
--
-- Pattern used on every table:
--   user_id uuid default auth.uid()   → Postgres fills in "who is logged in"
--   row level security + one policy   → you can only ever see/change your rows
-- ═════════════════════════════════════════════════════════════════════════════


-- ── Settings: exactly one row per user (user_id is the primary key) ──────────
create table public.settings (
  user_id            uuid primary key default auth.uid() references auth.users on delete cascade,
  display_name       text not null default 'Me' check (char_length(display_name) <= 40),
  avatar_path        text,                         -- path inside the "avatars" bucket
  streak_min_minutes int  not null default 45 check (streak_min_minutes between 5 and 600),
  exam_date_maths    date,
  exam_date_english  date,
  exam_date_georgian date,
  theme              text not null default 'dark' check (theme in ('dark', 'light')),
  updated_at         timestamptz not null default now()
);

-- ── Daily targets, versioned ─────────────────────────────────────────────────
-- Instead of overwriting the target, each change adds a row that applies from
-- `effective_from` onward. So raising Maths to 4h next month doesn't turn your
-- old "full days" into failures.
create table public.goal_versions (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  subject        text not null check (subject in ('maths', 'english', 'georgian')),
  daily_minutes  int  not null check (daily_minutes between 0 and 720),
  effective_from date not null,
  unique (user_id, subject, effective_from)
);

-- ── Finished study blocks ────────────────────────────────────────────────────
create table public.study_sessions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  subject         text not null check (subject in ('maths', 'english', 'georgian')),
  day             date not null,                   -- the Tbilisi calendar day
  started_at      timestamptz not null,
  ended_at        timestamptz not null,
  focused_seconds int  not null check (focused_seconds >= 0),  -- excludes pauses
  planned_minutes int  not null check (planned_minutes between 30 and 240),
  distractions    int  not null default 0 check (distractions >= 0),
  note            text check (char_length(note) <= 2000),
  created_at      timestamptz not null default now()
);
create index study_sessions_user_day on public.study_sessions (user_id, day);

-- ── The timer that is running right now (0 or 1 row per user) ────────────────
-- Stored in the database, not in JS memory, so it survives refresh, closing
-- the tab, and even switching from laptop to phone.
create table public.active_timer (
  user_id            uuid primary key default auth.uid() references auth.users on delete cascade,
  subject            text not null check (subject in ('maths', 'english', 'georgian')),
  phase              text not null check (phase in ('study', 'rest')),
  study_minutes      int  not null check (study_minutes between 30 and 240),
  rest_minutes       int  not null check (rest_minutes between 5 and 10),
  phase_started_at   timestamptz not null,
  paused_at          timestamptz,                  -- null = running
  paused_ms          bigint not null default 0,    -- total paused time this phase
  distractions       int  not null default 0,
  updated_at         timestamptz not null default now()
);

-- ── Milestones (kept forever, even if a streak later breaks) ─────────────────
create table public.milestones_earned (
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  milestone int  not null check (milestone in (10, 30, 50, 100, 150, 200)),
  earned_at timestamptz not null default now(),
  primary key (user_id, milestone)
);

-- ── Sunday reviews ───────────────────────────────────────────────────────────
create table public.weekly_reviews (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null,                        -- the Monday of that week
  answer     text not null check (char_length(answer) <= 2000),
  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- ── Topic checklist ──────────────────────────────────────────────────────────
create table public.topics (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  subject    text not null check (subject in ('maths', 'english', 'georgian')),
  title      text not null check (char_length(title) between 1 and 200),
  status     text not null default 'not_started'
             check (status in ('not_started', 'learning', 'confident')),
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

-- ── Maths mistake log ────────────────────────────────────────────────────────
create table public.mistakes (
  id              bigint generated always as identity primary key,
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  topic           text check (char_length(topic) <= 200),
  problem         text check (char_length(problem) <= 4000),
  photo_path      text,                            -- path inside "mistake-photos"
  what_went_wrong text check (char_length(what_went_wrong) <= 4000),
  needs_resolve   boolean not null default true,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);


-- ═════════════════════════════════════════════════════════════════════════════
-- Row Level Security: the actual lock on your data.
-- With RLS on and no policy, NOBODY can read a table through the API.
-- The policy below opens it only for the logged-in owner of each row.
-- ═════════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'settings', 'goal_versions', 'study_sessions', 'active_timer',
    'milestones_earned', 'weekly_reviews', 'topics', 'mistakes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner only" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;


-- Table permissions for the API roles. RLS above decides WHICH rows; these
-- grants decide whether a role may touch the table at all. Logged-out visitors
-- ("anon") get nothing.
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;


-- ═════════════════════════════════════════════════════════════════════════════
-- File storage: two PRIVATE buckets. Size + type limits are enforced by
-- Supabase itself, not just by the browser.
-- Files are stored as  <your-user-id>/<filename>  and the policy checks that
-- first folder matches the logged-in user.
-- ═════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',        'avatars',        false, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('mistake-photos', 'mistake-photos', false, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']);

create policy "own files only" on storage.objects for all to authenticated
  using (
    bucket_id in ('avatars', 'mistake-photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('avatars', 'mistake-photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
