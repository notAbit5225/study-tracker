-- Removes the demo data and puts your real start date back.
delete from study_sessions where note = 'DEMO';
update settings set tracking_start = '2026-11-06';

-- should show 0 and 2026-11-06
select (select count(*) from study_sessions where note = 'DEMO') as demo_sessions_left,
       (select tracking_start from settings) as tracking_start;
