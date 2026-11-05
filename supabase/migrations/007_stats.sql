-- ═════════════════════════════════════════════════════════════════════════════
-- 007 — the daily_totals view also adds up distractions per day, for the
-- stats page's "distractions per hour". (create or replace can add a column
-- at the end of a view without dropping it.)
-- ═════════════════════════════════════════════════════════════════════════════
create or replace view public.daily_totals
with (security_invoker = true) as
  select user_id, day, subject,
         sum(focused_seconds)::int as seconds,
         sum(distractions)::int    as distractions
  from public.study_sessions
  group by user_id, day, subject;
