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
