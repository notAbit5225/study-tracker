// Stats maths. Pure functions: history in, numbers out (tested in
// tests/stats.test.mjs). All days are Tbilisi dates; weeks start on Monday.
import { addDays, daysBetween, weekdayMon0, monthOf, firstOfMonth, daysInMonth, addMonths } from './days.js';

const SUBJECTS = ['maths', 'english', 'georgian'];

// The date range for a period kind, around an anchor day.
//   day   → that day            week → its Monday–Sunday
//   month → the calendar month  all  → tracking start → today
export function periodRange(kind, anchor, { start, today }) {
  if (kind === 'day') return { from: anchor, to: anchor };
  if (kind === 'week') {
    const from = addDays(anchor, -weekdayMon0(anchor));
    return { from, to: addDays(from, 6) };
  }
  if (kind === 'month') {
    const m = monthOf(anchor);
    return { from: firstOfMonth(m), to: addDays(firstOfMonth(m), daysInMonth(m) - 1) };
  }
  return { from: start, to: today };
}

// Move the anchor one period back (-1) or forward (+1).
export function stepAnchor(kind, anchor, dir) {
  if (kind === 'day') return addDays(anchor, dir);
  if (kind === 'week') return addDays(anchor, 7 * dir);
  if (kind === 'month') return firstOfMonth(addMonths(monthOf(anchor), dir));
  return anchor;
}

// Everything the stats page shows for one date range.
export function summarize(history, from, to) {
  const today = history.todayDay;
  const totals = { maths: 0, english: 0, georgian: 0 };
  const targets = { maths: 0, english: 0, georgian: 0 }; // sum of daily targets over counted days
  const days = []; // one entry per day in the range (for the chart)
  let distractions = 0;
  let counted = 0; // days that have started and are tracked (target maths uses these)

  for (let d = from; d <= to; d = addDays(d, 1)) {
    const info = history.days.get(d);
    const t = info?.totals ?? { maths: 0, english: 0, georgian: 0 };
    days.push({ day: d, totals: t, goals: info?.goals ?? null, status: info?.status ?? (d > today ? 'future' : 'before') });
    if (!info) continue; // before tracking started, or in the future
    counted += 1;
    distractions += history.distractionsByDay?.get(d) ?? 0;
    for (const s of SUBJECTS) {
      totals[s] += t[s];
      targets[s] += info.goals[s];
    }
  }

  const total = totals.maths + totals.english + totals.georgian;
  const targetTotal = targets.maths + targets.english + targets.georgian;
  const hours = total / 60;
  return {
    from,
    to,
    days,
    counted,
    totals,
    total,
    targets,
    targetTotal,
    distractions,
    perHour: hours > 0 ? distractions / hours : null, // null = nothing studied yet
  };
}

// Group a list of days into Monday-start weeks (for the all-time chart).
export function byWeek(days) {
  const weeks = [];
  for (const d of days) {
    const monday = addDays(d.day, -weekdayMon0(d.day));
    let w = weeks.at(-1);
    if (!w || w.day !== monday) {
      w = { day: monday, totals: { maths: 0, english: 0, georgian: 0 } };
      weeks.push(w);
    }
    for (const s of SUBJECTS) w.totals[s] += d.totals[s];
  }
  return weeks;
}

export const daysInRange = (from, to) => daysBetween(from, to) + 1;
