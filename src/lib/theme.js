// Theme = 'dark' | 'light'. The real value lives in your settings row (so it
// syncs between phone and laptop), but we also keep a copy in localStorage so
// the page starts in the right colours *before* the database has answered.
const KEY = 'desk-theme';

export function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f3e6cc' : '#221810');
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode etc. – not important */
  }
}
