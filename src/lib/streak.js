// ═════════════════════════════════════════════════════════════════════════════
// The streak rules, as one pure function: give it the numbers, get back how
// every day went. No database in here, which makes it easy to test.
//
// Walk forward one day at a time from your start date:
//   • total ≥ streak minimum  → the day counts, streak + 1
//        (and it's 'full' if every subject hit its target,
//         'fullplus' if on top of that you did 1h+ more than all targets)
//   • under the minimum:
//        – a streak is running AND no skip used in the 13 days before
//          → 'skip': the streak survives, but doesn't grow
//        – otherwise → 'missed': streak back to 0
//   • today, while it's still going, is never 'missed' – it's 'pending'
// ═════════════════════════════════════════════════════════════════════════════
import { addDays, daysBetween } from './days.js';

export const SKIP_EVERY = 14; // one skip per rolling 14 days
export const EXTRA_FOR_PLUS = 60; // minutes over all targets for the gold seal

const ZERO = { maths: 0, english: 0, georgian: 0 };

// totalsByDay: Map 'YYYY-MM-DD' → { maths, english, georgian } in minutes
// goalsFor:    function(day) → { maths, english, georgian, streak_min }
export function computeHistory({ totalsByDay, goalsFor, start, today }) {
  const days = new Map();
  let streak = 0;
  let best = 0;
  let lastSkip = null;

  const judge = (day) => {
    const totals = totalsByDay.get(day) ?? ZERO;
    const goals = goalsFor(day);
    const total = totals.maths + totals.english + totals.georgian;
    const targetSum = goals.maths + goals.english + goals.georgian;
    const full = ['maths', 'english', 'georgian'].every((s) => totals[s] >= goals[s]);
    let level = null;
    if (total >= goals.streak_min) level = full ? (total - targetSum >= EXTRA_FOR_PLUS ? 'fullplus' : 'full') : 'min';
    return { totals, goals, total, level };
  };

  // finished days: from the start up to yesterday
  for (let day = start; day < today; day = addDays(day, 1)) {
    const j = judge(day);
    let status;
    let broke = false;
    if (j.level) {
      status = j.level;
      streak += 1;
    } else if (streak > 0 && (lastSkip === null || daysBetween(lastSkip, day) >= SKIP_EVERY)) {
      status = 'skip';
      lastSkip = day;
    } else {
      status = 'missed';
      broke = streak > 0; // did this miss actually end a streak?
      streak = 0;
    }
    best = Math.max(best, streak);
    days.set(day, { ...j, status, broke });
  }

  // today (only if tracking has started)
  let todayInfo = null;
  if (today >= start) {
    const j = judge(today);
    if (j.level) {
      streak += 1;
      best = Math.max(best, streak);
    }
    todayInfo = { ...j, status: j.level ?? 'pending', minutesLeft: Math.max(0, j.goals.streak_min - j.total) };
    days.set(today, todayInfo);
  }

  // when can the next skip be used?
  const skipFrom = lastSkip ? addDays(lastSkip, SKIP_EVERY) : start;
  const skipReady = today >= skipFrom;

  return {
    days, // Map day → { status, totals, goals, total }
    streak,
    best,
    isBest: streak > 0 && streak === best,
    today: todayInfo,
    lastSkip,
    nextSkip: skipReady ? null : skipFrom, // null = available now
    started: today >= start,
    start,
    todayDay: today,
  };
}
