// Weekly reviews: one answer per week, keyed by that week's Monday.
import { supabase } from './supabase.js';
import { addDays, weekdayMon0 } from './days.js';

export const mondayOf = (day) => addDays(day, -weekdayMon0(day));

// Which week is "up for review" today?
//   Sunday      → this week (it's the last day of it)
//   Mon – Sat   → last week (in case you skipped Sunday)
export function reviewWeekFor(today) {
  return weekdayMon0(today) === 6 ? mondayOf(today) : addDays(mondayOf(today), -7);
}

export async function getReview(weekStart) {
  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('week_start, answer')
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveReview(weekStart, answer) {
  const { error } = await supabase
    .from('weekly_reviews')
    .upsert({ week_start: weekStart, answer: answer.trim() }, { onConflict: 'user_id,week_start' });
  if (error) throw error;
}

export async function listReviews() {
  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('week_start, answer')
    .order('week_start', { ascending: false });
  if (error) throw error;
  return data;
}

// Should Today show the review prompt? Returns { week, sunday } or null.
export async function pendingReview(today, trackingStart) {
  const week = reviewWeekFor(today);
  if (addDays(week, 6) < trackingStart) return null; // that week was before you started
  const done = await getReview(week);
  return done ? null : { week, sunday: weekdayMon0(today) === 6 };
}
