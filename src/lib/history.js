// Loads everything the streak needs from the database and runs the rules.
import { supabase } from './supabase.js';
import { tbilisiDay } from './time.js';
import { loadGoals, goalsOn } from './goals.js';
import { getSettings } from './settings.js';
import { computeHistory } from './streak.js';
import { checkMilestones } from './milestones.js';
import { celebrate } from '../ui/celebrate.js';

// Supabase returns at most 1000 rows per request, so we fetch in pages.
// (~3 rows per day → a 1000-row page covers almost a year.)
async function fetchAllDailyTotals() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('daily_totals')
      .select('day, subject, seconds')
      .order('day')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function loadHistory() {
  const [rows] = await Promise.all([fetchAllDailyTotals(), loadGoals()]);

  const totalsByDay = new Map();
  for (const r of rows) {
    if (!totalsByDay.has(r.day)) totalsByDay.set(r.day, { maths: 0, english: 0, georgian: 0 });
    totalsByDay.get(r.day)[r.subject] = r.seconds / 60;
  }

  const history = computeHistory({
    totalsByDay,
    goalsFor: goalsOn,
    start: getSettings().tracking_start,
    today: tbilisiDay(),
  });

  // Not awaited on purpose: the page draws right away, and a celebration
  // (if one is due) pops up on top a moment later.
  checkMilestones(history, celebrate);
  return history;
}

// Every session on one day, with notes (for the calendar's day panel).
export async function sessionsOn(day) {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('subject, focused_seconds, distractions, note, started_at')
    .eq('day', day)
    .order('started_at');
  if (error) throw error;
  return data;
}
