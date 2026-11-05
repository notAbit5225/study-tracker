// Daily goals: the three subject targets + the streak minimum.
//
// They're *versioned*: each change is a new row in goal_versions with an
// `effective_from` date. To know the goals for any day, take the newest
// version that had started by then. That way changing your targets in March
// doesn't rewrite what counted as a "full day" in December.
import { supabase } from './supabase.js';
import { tbilisiDay } from './time.js';

export const GOAL_KINDS = ['maths', 'english', 'georgian', 'streak_min'];

let versions = null; // all rows, oldest first

export async function loadGoals() {
  const { data, error } = await supabase
    .from('goal_versions')
    .select('subject, daily_minutes, effective_from')
    .order('effective_from', { ascending: true });
  if (error) throw error;
  versions = data;
  return data;
}

// → { maths: 180, english: 90, georgian: 120, streak_min: 60 } for that day.
// 'YYYY-MM-DD' strings compare correctly as text, so <= works on dates here.
export function goalsOn(day = tbilisiDay()) {
  const out = {};
  for (const kind of GOAL_KINDS) {
    const rows = versions.filter((v) => v.subject === kind);
    const active = rows.filter((v) => v.effective_from <= day).at(-1) ?? rows[0];
    out[kind] = active?.daily_minutes ?? 0;
  }
  return out;
}

// Save new goals, effective from today. Changing them twice in one day just
// overwrites today's row (that's what onConflict + upsert does).
export async function saveGoals(goals) {
  const today = tbilisiDay();
  const rows = GOAL_KINDS.map((kind) => ({
    subject: kind,
    daily_minutes: goals[kind],
    effective_from: today,
  }));
  const { error } = await supabase
    .from('goal_versions')
    .upsert(rows, { onConflict: 'user_id,subject,effective_from' });
  if (error) throw error;
  await loadGoals();
}

// How a day went, given minutes per subject and that day's goals.
export function dayStatus(totals, goals) {
  const total = totals.maths + totals.english + totals.georgian;
  const full = ['maths', 'english', 'georgian'].every((s) => totals[s] >= goals[s]);
  return {
    total,
    full, // every subject hit its own target
    minimum: total >= goals.streak_min, // enough to keep the streak
  };
}
