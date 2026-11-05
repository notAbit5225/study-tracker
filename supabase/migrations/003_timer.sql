-- ═════════════════════════════════════════════════════════════════════════════
-- 003: timer changes (run once in SQL Editor, after 002).
-- ═════════════════════════════════════════════════════════════════════════════

-- Rest can now be 5–15 minutes (was 5–10).
alter table public.active_timer
  drop constraint active_timer_rest_minutes_check,
  add  constraint active_timer_rest_minutes_check check (rest_minutes between 5 and 15);

-- "+ add time" is stored separately from the length you picked, so the next
-- round goes back to your normal length. study_minutes is the picked length
-- again (30 min–4 h); added_minutes is the open-ended extra.
alter table public.active_timer
  drop constraint active_timer_study_minutes_check,
  add  constraint active_timer_study_minutes_check check (study_minutes between 30 and 240),
  add  column added_minutes int not null default 0 check (added_minutes between 0 and 1200);

-- One saved session per start time. If your laptop AND phone both notice a
-- study block ended at the same moment, both try to save it – this makes the
-- second save a harmless no-op instead of a duplicate.
alter table public.study_sessions
  add constraint study_sessions_one_per_start unique (user_id, started_at);

-- Realtime: lets the app hear about timer changes instantly, so pausing on the
-- laptop pauses the phone's view too. RLS still applies to what it hears.
alter publication supabase_realtime add table public.active_timer;
