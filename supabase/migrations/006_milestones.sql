-- ═════════════════════════════════════════════════════════════════════════════
-- 006 — milestones remember whether you've seen the celebration.
-- A new milestone row starts with celebrated = false. Whichever device you open
-- first shows the celebration and flips it to true, so it never repeats.
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.milestones_earned
  add column celebrated boolean not null default false;
