-- ═════════════════════════════════════════════════════════════════════════════
-- 002 — your updated rules (run once in SQL Editor, after 001).
--
--  • streak minimum now defaults to 60 minutes (was 45)
--  • a study block can be extended with "+ add time" with no 4-hour cap,
--    so the old "between 30 and 240" checks are replaced.
--    The 24h cap is only a sanity check against bugs, not a real limit.
--
-- This is how real projects change a database: never edit 001 after it has
-- run. Add a new numbered file instead, so the history of changes is kept.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.settings
  alter column streak_min_minutes set default 60;

-- Postgres auto-names a column check as <table>_<column>_check.
alter table public.active_timer
  drop constraint active_timer_study_minutes_check,
  add  constraint active_timer_study_minutes_check
       check (study_minutes between 30 and 1440);

alter table public.study_sessions
  drop constraint study_sessions_planned_minutes_check,
  add  constraint study_sessions_planned_minutes_check
       check (planned_minutes between 30 and 1440);
