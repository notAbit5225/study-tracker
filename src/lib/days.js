// Date maths on 'YYYY-MM-DD' strings (the Tbilisi calendar days we store).
//
// We do the arithmetic in UTC on purpose: a "day" here is just a calendar
// date, and UTC has no daylight-saving jumps, so adding 1 always gives the
// next date. (The *Tbilisi* part already happened when the day was saved.)
const toUTC = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (day, n) => fromUTC(toUTC(day) + n * 86_400_000);
export const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86_400_000); // b − a

// Monday = 0 … Sunday = 6 (your weeks start on Monday)
export const weekdayMon0 = (day) => (new Date(toUTC(day)).getUTCDay() + 6) % 7;

export const monthOf = (day) => day.slice(0, 7); // 'YYYY-MM'
export const firstOfMonth = (month) => `${month}-01`;
export const addMonths = (month, n) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
export const daysInMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

const longFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' });

export const prettyDay = (day) => longFmt.format(toUTC(day)); // "Friday 6 November"
export const shortDay = (day) => shortFmt.format(toUTC(day)); // "Fri 6 Nov"
export const prettyMonth = (month) => monthFmt.format(toUTC(firstOfMonth(month))); // "November 2026"
