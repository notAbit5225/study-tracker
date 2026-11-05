// Tests for the streak rules. Run with:  npm test
// Each block builds a few fake days and checks what the rules decide.
import { computeHistory } from '../src/lib/streak.js';
import assert from 'node:assert/strict';
const G = { maths: 180, english: 90, georgian: 120, streak_min: 60 };
const goalsFor = () => G;
const m = (maths, english = 0, georgian = 0) => ({ maths, english, georgian });
function run(list, today) {
  const totalsByDay = new Map(Object.entries(list));
  return computeHistory({ totalsByDay, goalsFor, start: '2026-11-06', today });
}
let r;
// 1. levels
r = run({ '2026-11-06': m(60), '2026-11-07': m(180, 90, 120), '2026-11-08': m(240, 90, 120) }, '2026-11-09');
assert.deepEqual([...r.days.values()].map(d => d.status), ['min', 'full', 'fullplus', 'pending']);
assert.equal(r.streak, 3); assert.equal(r.best, 3); assert.equal(r.isBest, true);
assert.equal(r.today.minutesLeft, 60);
// 2. a miss with a running streak uses a skip, which does not add
r = run({ '2026-11-06': m(60), '2026-11-07': m(0), '2026-11-08': m(60) }, '2026-11-09');
assert.deepEqual([...r.days.values()].map(d => d.status).slice(0, 3), ['min', 'skip', 'min']);
assert.equal(r.streak, 2); assert.equal(r.lastSkip, '2026-11-07'); assert.equal(r.nextSkip, '2026-11-21');
// 3. second miss within 14 days breaks; best survives
r = run({ '2026-11-06': m(60), '2026-11-07': m(0), '2026-11-08': m(60), '2026-11-09': m(60), '2026-11-10': m(0), '2026-11-11': m(60) }, '2026-11-12');
assert.deepEqual([...r.days.values()].map(d => d.status).slice(0, 6), ['min', 'skip', 'min', 'min', 'missed', 'min']);
assert.equal(r.streak, 1); assert.equal(r.best, 3); assert.equal(r.isBest, false);
// 4. skip exactly 14 days later is allowed again
const l = {}; for (let i = 6; i <= 30; i++) l[`2026-11-${String(i).padStart(2,'0')}`] = m(60);
l['2026-11-07'] = m(0); l['2026-11-21'] = m(0);
r = run(l, '2026-12-01');
assert.equal(r.days.get('2026-11-21').status, 'skip'); assert.equal(r.streak, 23);
// 5. day 1 missed with no streak is just missed (no skip wasted)
r = run({ '2026-11-06': m(10) }, '2026-11-07');
assert.equal(r.days.get('2026-11-06').status, 'missed'); assert.equal(r.nextSkip, null);
// 6. today hitting minimum counts right away
r = run({ '2026-11-06': m(70) }, '2026-11-06');
assert.equal(r.streak, 1); assert.equal(r.today.status, 'min');
// 7. before start: nothing
r = run({}, '2026-11-05');
assert.equal(r.started, false); assert.equal(r.streak, 0); assert.equal(r.days.size, 0);
console.log('all streak tests passed');

// 8. the "yesterday" info the Today heads-up uses
r = run({ '2026-11-06': m(60), '2026-11-07': m(0) }, '2026-11-08');
assert.equal(r.todayDay, '2026-11-08');
assert.equal(r.days.get('2026-11-07').status, 'skip');
assert.equal(r.nextSkip, '2026-11-21');
console.log('heads-up test passed');
