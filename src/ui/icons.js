// Small hand-drawn-looking SVG marks for the calendar. They use
// `currentColor`, so CSS decides their colour. Paths are deliberately a bit
// wobbly so they look inked by hand rather than perfect.
export const ICONS = {
  // gold wax seal with a star – full day + 1h extra
  fullplus: `<svg viewBox="0 0 32 32" aria-hidden="true"><path class="seal" d="M16 1.8l2.6 2.3 3.4-.7 1.2 3.2 3.3 1.1-.6 3.4 2.4 2.6-2.3 2.6.7 3.4-3.2 1.2-1.1 3.3-3.4-.6L16 30.2l-2.6-2.3-3.4.7-1.2-3.2-3.3-1.1.6-3.4-2.4-2.6 2.3-2.6-.7-3.4 3.2-1.2 1.1-3.3 3.4.6z"/><path class="star" d="M16 8.6l2.1 4.6 5 .5-3.8 3.3 1.1 4.9L16 19.4l-4.4 2.5 1.1-4.9-3.8-3.3 5-.5z"/></svg>`,
  // stamped tick – full day
  full: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle class="ring" cx="16" cy="16" r="12.5"/><path class="mark" d="M10 16.6l4 3.9 8.3-9.1"/></svg>`,
  // small dot – minimum
  min: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle class="dot" cx="16" cy="16" r="3.6"/></svg>`,
  // a little bridge – skip day carried the streak over
  skip: `<svg viewBox="0 0 32 32" aria-hidden="true"><path class="mark" d="M5 21c3.5-7.5 18.5-7.5 22 0M9 21v-3.4M23 21v-3.4"/></svg>`,
  // crossed out – missed, streak broke
  missed: `<svg viewBox="0 0 32 32" aria-hidden="true"><path class="mark" d="M10.5 10.8l11 10.6M21.6 10.4l-11.3 11.2"/></svg>`,
};

export const STATUS_LABEL = {
  fullplus: 'Full day, 1h+ extra',
  full: 'Full day',
  min: 'Minimum hit',
  skip: 'Skip day used',
  missed: 'Missed',
  pending: 'Today, still going',
};
