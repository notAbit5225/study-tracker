import { TIMEZONE } from '../config.js';

// Returns the Tbilisi calendar day for a moment in time, as 'YYYY-MM-DD'.
//
// Why not `date.toISOString().slice(0, 10)`? That gives the UTC day. Tbilisi is
// UTC+4, so a session at 02:00 Tbilisi time would be filed under *yesterday*.
// Intl.DateTimeFormat does the timezone maths for us, using the browser's
// built-in timezone database. 'en-CA' happens to format dates as YYYY-MM-DD.
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function tbilisiDay(date = new Date()) {
  return dayFormatter.format(date);
}

// 2_537_000 ms → "42:17", 3_725_000 → "1:02:05". Used for the big timer digits.
export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// 90 → "1h 30m", 45 → "45m", 120 → "2h". Used for lengths and totals.
export function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
