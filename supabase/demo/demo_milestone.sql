-- ═════════════════════════════════════════════════════════════════════════════
-- DEMO ONLY: fake a 10-day streak (27 Oct – 5 Nov, 1h maths each day) so the
-- 10-day milestone gets earned and its celebration plays for real.
-- Undo everything with demo_milestone_cleanup.sql.
-- ═════════════════════════════════════════════════════════════════════════════
update settings set tracking_start = '2026-10-27';

insert into study_sessions
  (user_id, subject, day, started_at, ended_at, focused_seconds, planned_minutes, distractions, note)
select
  (select id from auth.users limit 1),
  'maths',
  d::date,
  (d + interval '10 hours') at time zone 'Asia/Tbilisi',
  (d + interval '11 hours') at time zone 'Asia/Tbilisi',
  3600, 60, 0, 'DEMO'
from generate_series('2026-10-27'::timestamp, '2026-11-05'::timestamp, interval '1 day') as d
on conflict (user_id, started_at) do nothing;

select count(*) as demo_days from study_sessions where note = 'DEMO';  -- should be 10
