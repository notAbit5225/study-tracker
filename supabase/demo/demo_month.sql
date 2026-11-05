-- ═════════════════════════════════════════════════════════════════════════════
-- DEMO ONLY: pretend tracking started on 20 Oct and fill those days with fake
-- study time, so you can see every calendar mark. Every fake session has
-- note = 'DEMO', so demo_cleanup.sql can remove exactly these and nothing else.
-- Safe to run twice ("on conflict do nothing" skips rows that already exist).
-- ═════════════════════════════════════════════════════════════════════════════

update settings set tracking_start = '2026-10-20';

with plan(day, maths, english, georgian) as (values
  ('2026-10-20'::date,  60,   0,   0),  -- minimum
  ('2026-10-21'::date, 180,  90, 120),  -- full day
  ('2026-10-22'::date, 240, 100, 140),  -- full day + 1h extra (gold seal)
  ('2026-10-23'::date,  10,   0,   0),  -- missed: skip day used automatically
  ('2026-10-24'::date,  70,  20,   0),  -- minimum
  ('2026-10-25'::date, 180,  90, 120),  -- full day
  ('2026-10-26'::date,   0,   0,   0),  -- missed again, no skip left: streak breaks
  ('2026-10-27'::date,  90,   0,   0),  -- minimum
  ('2026-10-28'::date, 180,  95, 125),  -- full day
  ('2026-10-29'::date, 250,  90, 130),  -- full day + 1h extra
  ('2026-10-30'::date,  60,  30,   0),  -- minimum
  ('2026-10-31'::date, 180,  90, 120),  -- full day
  ('2026-11-01'::date,  45,  30,   0),  -- minimum
  ('2026-11-02'::date, 180,  90, 120),  -- full day
  ('2026-11-03'::date, 220, 110, 130),  -- full day + 1h extra
  ('2026-11-04'::date,  60,   0,  30)   -- minimum
),
rows as (
  select day, 'maths' as subject, maths as mins, 9 as hr from plan
  union all
  select day, 'english', english, 14 from plan
  union all
  select day, 'georgian', georgian, 18 from plan
)
insert into study_sessions
  (user_id, subject, day, started_at, ended_at, focused_seconds, planned_minutes, distractions, note)
select
  (select id from auth.users limit 1),
  subject,
  day,
  (day + make_interval(hours => hr)) at time zone 'Asia/Tbilisi',
  (day + make_interval(hours => hr, mins => mins)) at time zone 'Asia/Tbilisi',
  mins * 60,
  greatest(mins, 30),
  0,
  'DEMO'
from rows
where mins > 0
on conflict (user_id, started_at) do nothing;

-- shows how many demo sessions exist now (should be 35)
select count(*) as demo_sessions from study_sessions where note = 'DEMO';
