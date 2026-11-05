-- Removes the fake streak, the milestone it earned, and restores your start date.
delete from study_sessions where note = 'DEMO';
delete from milestones_earned;
update settings set tracking_start = '2026-11-06';

select (select count(*) from study_sessions where note = 'DEMO') as demo_left,
       (select count(*) from milestones_earned) as milestones_left,
       (select tracking_start from settings) as tracking_start;
