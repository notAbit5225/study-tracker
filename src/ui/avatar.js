// Draws your avatar into an element: the photo if you have one, otherwise the
// first letter of your name on a mustard circle.
import { getAvatarUrl } from '../lib/avatar.js';

function initialOf(name) {
  // Array.from splits by real characters, so Georgian letters work too.
  const first = Array.from((name || '').trim())[0];
  return first ? first.toUpperCase() : '·';
}

export async function paintAvatar(el, settings) {
  const letter = initialOf(settings?.display_name);
  el.classList.add('avatar');
  el.setAttribute('aria-label', settings?.display_name || 'You');

  const url = await getAvatarUrl(settings?.avatar_path);
  if (url) {
    const img = new Image();
    img.alt = '';
    img.src = url;
    img.onerror = () => (el.textContent = letter); // file missing? fall back
    el.replaceChildren(img);
  } else {
    el.textContent = letter;
  }
}
