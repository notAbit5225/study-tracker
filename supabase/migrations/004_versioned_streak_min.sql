-- ═════════════════════════════════════════════════════════════════════════════
-- 004 — the streak minimum becomes versioned, like the subject targets.
--
-- Before: settings.streak_min_minutes (one number; changing it would rewrite
--         history – old streak days could suddenly "fail").
-- After:  a row in goal_versions with subject = 'streak_min'. A change adds a
--         new row from today on, and past days keep the minimum they had.
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. allow the new kind of goal
alter table public.goal_versions
  drop constraint goal_versions_subject_check,
  add  constraint goal_versions_subject_check
       check (subject in ('maths', 'english', 'georgian', 'streak_min'));

-- 2. copy your current minimum over, starting from your very first goal date
insert into public.goal_versions (user_id, subject, daily_minutes, effective_from)
select s.user_id,
       'streak_min',
       s.streak_min_minutes,
       (select min(g.effective_from) from public.goal_versions g where g.user_id = s.user_id)
from public.settings s
where exists (select 1 from public.goal_versions g where g.user_id = s.user_id)
on conflict do nothing;

-- 3. the old column isn't the source of truth any more – remove it so nothing
--    can accidentally read a stale value
alter table public.settings drop column streak_min_minutes;
