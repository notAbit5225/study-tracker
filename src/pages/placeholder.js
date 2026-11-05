// Pages that don't exist yet. Each one says which phase builds it, so you
// can see the whole app's shape from day one.
const PAGES = {
  calendar: {
    title: 'Calendar',
    phase: 4,
    line: 'Every day you show up gets marked here. Skip days too.',
  },
  stats: {
    title: 'Stats',
    phase: 6,
    line: 'Hours per subject, by day, week, month, or all time.',
  },
  logbook: {
    title: 'Logbook',
    phase: 6,
    line: 'Topic checklist and the maths mistake log. Photos welcome.',
  },
};

export function placeholder(id) {
  const p = PAGES[id];
  return {
    render(view) {
      view.innerHTML = `
        <header class="page-head">
          <h1>${p.title}</h1>
        </header>
        <div class="soon">
          <p class="soon__stamp">phase ${p.phase}</p>
          <p class="soon__line">${p.line}</p>
        </div>
      `;
    },
  };
}
