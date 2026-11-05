# Desk: project plan

Personal study tracker for the national exams (Maths, English, Georgian).
Vite + vanilla JS + hand-written CSS → GitHub Pages. Supabase for auth, database and file storage.
All days follow **Asia/Tbilisi**; weeks start on **Monday**.

## Phases

| # | Phase | Contents |
|---|-------|----------|
| 0 | Setup | Vite project, Supabase tables + RLS + storage, GitHub Pages deploy |
| 1 | Access | Email + password login (once per device), stay logged in, app layout + navigation, settings: name, avatar (jpg/png/webp ≤ 2 MB, circle, initial fallback), theme |
| 2 | Timer | Subject, study length 30 min–4 h to start, **+ add time anytime (no upper limit)**, **finish early anytime (all time counts)**, rest 5–15 min (**only after 45+ min of real study**; "Rest now" button unlocks at 45 min; shorter blocks just save and end), pause/resume, survives refresh (DB timestamps), sound + notification, **mini floating timer (instead of fullscreen focus mode) + countdown in the tab title**, distraction button (+ D key, undo), stops after rest and waits for "next round" |
| 3 | Goals & progress | Per-subject targets (versioned; default Maths 3h, English 1h30m, Georgian 2h), streak minimum (**default 1 h total**, editable) keeps the streak, all three targets = "full day", today's progress bars, post-session note |
| 4 | Calendar & streak | Month view (minimum / full / skip / missed), streak counter, auto skip day (1 per rolling 14 days), "next skip available" |
| 5 | Milestones | 10, 30, 50, 100, 150, 200 days: each with its own small animation + message; "milestones earned" in profile |
| 6 | Extras | Exam countdown (3 dates, next one highlighted), **stats page (below)**, Sunday weekly review, topic checklist, maths mistake log with photos, PWA install |
| 7 | Design polish | Texture, motion, microcopy, dark/cream tuning |

## Stats page (Phase 6)

- **Streaks:** current streak and highest streak ever.
- **Period switcher:** Day / Week / Month / All time. Picking one updates everything below.
  - Day = today, Week = Monday–Sunday, Month = calendar month, All time = first session until today.
  - Arrows to step back to earlier days/weeks/months.
- **Time per subject** (Maths, English, Georgian) for the period, plus the **total** of all three.
- **Chart** for the period:
  - Day: one bar per subject vs. its target
  - Week / Month: hours per day, stacked by subject
  - All time: hours per week
- **Compared to target:** for each subject, time studied ÷ (daily target × days in the period).
  - Targets come from `goal_versions`, so each day uses the target that applied *on that day*.
  - For the current week/month, only days up to today count, so the percentage isn't dragged down by days that haven't happened yet.
- Everything is calculated from `study_sessions.day` (already a Tbilisi date), so no new tables are needed.
