// Escapes text before it goes inside an HTML template string.
//
// Why: we build pages with template strings like `<p>${name}</p>`. If `name`
// contained "<img src=x onerror=alert(1)>", the browser would run it. That's
// called XSS. esc() turns < > & " ' into harmless codes so text stays text.
// Rule of thumb: anything that came from the database or an input → esc() it.
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => MAP[ch]);
}
