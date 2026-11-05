// A tiny "hash router". URLs look like  …/study-tracker/#/timer
// Everything after # never reaches the server, which is exactly why this works
// on GitHub Pages: the server always sends index.html, and JS picks the page.
//
// Each page module exports  render(view)  and may return a cleanup function
// (to stop timers, remove listeners…) that runs when you leave the page.

export function startRouter({ routes, fallback, outlet, onChange }) {
  let cleanup = null;

  function go() {
    const name = location.hash.replace(/^#\/?/, '').split('/')[0];
    const key = routes[name] ? name : fallback;

    if (typeof cleanup === 'function') cleanup();
    cleanup = null;

    // A fresh element per visit: if an async page finishes loading after you
    // already navigated away, it writes into this detached element harmlessly.
    const view = document.createElement('div');
    view.className = `view view--${key}`;
    outlet.replaceChildren(view);

    const result = routes[key].render(view);
    if (typeof result === 'function') cleanup = result;
    else if (result?.then) result.then((fn) => (cleanup = fn ?? null));

    onChange?.(key);
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', go);
  go();
  return () => {
    window.removeEventListener('hashchange', go);
    if (typeof cleanup === 'function') cleanup();
  };
}
