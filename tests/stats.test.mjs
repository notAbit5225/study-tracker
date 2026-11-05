// Tests for the stats maths. Run with:  npm test
import { computeHistory } from '../src/lib/streak.js';
import { periodRange, stepAnchor, summarize, byWeek } from '../src/lib/stats.js';
import assert from 'node:assert/strict';

const G = { maths: 180, english: 90, georgian: 120, streak_min: 60 };
const m = (maths, english = 0, georgian = 0) => ({ maths, english, georgian });
const totalsByDay = new Map([
  ['2026-11-06', m(60, 30)],
  ['2026-11-07', m(180, 90, 120)],
  ['2026-11-09', m(90)],
]);
const h = computeHistory({ totalsByDay, goalsFor: () => G, start: '2026-11-06', today: '2026-11-10' });
h.distractionsByDay = new Map([['2026-11-06', 3], ['2026-11-07', 3]]);
const ctx = { start: '2026-11-06', today: '2026-11-10' };

// periods: weeks start Monday
assert.deepEqual(periodRange('week', '2026-11-10', ctx), { from: '2026-11-09', to: '2026-11-15' });
assert.deepEqual(periodRange('week', '2026-11-08', ctx), { from: '2026-11-02', to: '2026-11-08' }); // Sunday
assert.deepEqual(periodRange('month', '2026-11-10', ctx), { from: '2026-11-01', to: '2026-11-30' });
assert.deepEqual(periodRange('all', '2026-11-10', ctx), { from: '2026-11-06', to: '2026-11-10' });
assert.equal(stepAnchor('month', '2026-11-10', -1), '2026-10-01');
assert.equal(stepAnchor('week', '2026-11-10', 1), '2026-11-17');

// all time: 5 tracked days (6th..10th), totals add up
const all = summarize(h, '2026-11-06', '2026-11-10');
assert.equal(all.counted, 5);
assert.deepEqual(all.totals, { maths: 330, english: 120, georgian: 120 });
assert.equal(all.targets.maths, 5 * 180);
assert.equal(all.total, 570);
assert.equal(all.distractions, 6);
assert.ok(Math.abs(all.perHour - 6 / 9.5) < 1e-9);

// a month only counts days that are tracked and not in the future
const nov = summarize(h, '2026-11-01', '2026-11-30');
assert.equal(nov.counted, 5);
assert.equal(nov.days.length, 30);
assert.equal(nov.days[0].status, 'before');
assert.equal(nov.days.at(-1).status, 'future');

// nothing studied → no per-hour number (not a divide by zero)
const empty = summarize(h, '2026-11-08', '2026-11-08');
assert.equal(empty.perHour, null);

// weeks group from Monday
const weeks = byWeek(all.days);
assert.deepEqual(weeks.map((w) => w.day), ['2026-11-02', '2026-11-09']);
assert.equal(weeks[0].totals.maths, 240);

console.log('all stats tests passed');
