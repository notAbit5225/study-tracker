-- ═════════════════════════════════════════════════════════════════════════════
-- 005 — calendar + streak (run once in SQL Editor, after 004).
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. The day tracking starts. Days before it are neutral: never "missed",
--    never part of a streak. You chose to start on Friday 6 November 2026.
alter table public.settings
  add column tracking_start date not null default '2026-11-06';

-- 2. A VIEW = a saved query that behaves like a read-only table.
--    It adds up seconds per day per subject, so the calendar downloads
--    ~3 small rows per day instead of every single session.
--    security_invoker = true makes it run *as you*, so the RLS rules on
--    study_sessions still apply – it can't leak anything.
create view public.daily_totals
with (security_invoker = true) as
  select user_id, day, subject, sum(focused_seconds)::int as seconds
  from public.study_sessions
  group by user_id, day, subject;

grant select on public.daily_totals to authenticated;
