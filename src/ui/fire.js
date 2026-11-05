// The streak flame. It evolves as your *current* streak grows: every
// milestone unlocks a bigger, stranger fire. Break the streak and it starts
// again from a spark (your badges, on the other hand, are forever).
//
// Built from layers of the same flame shape at different sizes. Each layer
// sits in its own <g> so the CSS flicker (a transform) doesn't fight the
// size (also a transform) – same trick as the laurel leaves.

export const FIRE_TIERS = [
  { from: 0, key: 'ember', name: 'Cold ember' },
  { from: 1, key: 'spark', name: 'Spark' },
  { from: 10, key: 'kindling', name: 'Kindling' },
  { from: 30, key: 'hearth', name: 'Hearth' },
  { from: 50, key: 'blaze', name: 'Blaze' },
  { from: 100, key: 'golden', name: 'Golden fire' },
  { from: 150, key: 'phoenix', name: 'Phoenix' },
  { from: 200, key: 'eternal', name: 'Eternal flame' },
];

export function fireTier(streak) {
  let i = 0;
  while (i + 1 < FIRE_TIERS.length && streak >= FIRE_TIERS[i + 1].from) i++;
  return { ...FIRE_TIERS[i], index: i, next: FIRE_TIERS[i + 1] ?? null };
}

// one flame shape, base at (32, 76) in a 64×80 box
const FLAME =
  'M32 3 C35 16 46 22 50 36 C55 52 50 70 32 76 C14 70 9 54 14 40 C17 31 23 27 24 18 C29 25 30 30 30 34 C34 26 34 14 32 3 Z';

const layer = (cls, scale, fill) =>
  `<g class="fl ${cls}"><path d="${FLAME}" fill="${fill}" transform="translate(32 76) scale(${scale}) translate(-32 -76)"/></g>`;

const tongues = (fill) => `
  <g class="fl fl-tongue fl-tongue--l"><path d="M20 66 C9 58 8 46 12 36 C15 47 20 53 26 57 Z" fill="${fill}"/></g>
  <g class="fl fl-tongue fl-tongue--r"><path d="M44 66 C55 58 56 46 52 36 C49 47 44 53 38 57 Z" fill="${fill}"/></g>`;

const wings = (fill) => `
  <g class="fl fl-wing fl-wing--l"><path d="M27 66 C10 66 0 50 1 26 C8 40 15 47 25 49 C18 40 18 33 21 26 C24 38 28 46 31 52 Z" fill="${fill}"/></g>
  <g class="fl fl-wing fl-wing--r"><path d="M37 66 C54 66 64 50 63 26 C56 40 49 47 39 49 C46 40 46 33 43 26 C40 38 36 46 33 52 Z" fill="${fill}"/></g>`;

const embers = (n, fill) =>
  Array.from({ length: n }, (_, i) => {
    const x = 20 + ((i * 37) % 26);
    return `<circle class="fl-ember" style="--d:${(i * 0.37).toFixed(2)}s;--x:${(i % 2 ? 1 : -1) * (3 + (i % 3) * 2)}px" cx="${x}" cy="${58 - (i % 3) * 6}" r="${1 + (i % 2) * 0.6}" fill="${fill}"/>`;
  }).join('');

const glow = (id, color, r = 34) => `
  <defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>
  <circle class="fl-glow" cx="32" cy="52" r="${r}" fill="url(#${id})"/>`;

const sparkle = (x, y, s, fill) =>
  `<path d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="${fill}"/>`;

let uid = 0;

const DRAW = {
  ember: () => `<circle cx="32" cy="66" r="6" fill="#5a4636"/><circle cx="32" cy="66" r="2.5" fill="#8a5a3a"/>`,

  spark: () => `
    ${layer('fl-outer', 0.62, '#c0652a')}
    ${layer('fl-core', 0.36, '#e8b33a')}`,

  kindling: () => `
    ${layer('fl-outer', 0.82, '#9e4e1d')}
    ${layer('fl-mid', 0.62, '#d9692a')}
    ${layer('fl-core', 0.38, '#f2c14e')}`,

  hearth: () => `
    ${tongues('#b3401a')}
    ${layer('fl-outer', 0.92, '#b3401a')}
    ${layer('fl-mid', 0.7, '#e2702a')}
    ${layer('fl-core', 0.44, '#f6c95a')}
    ${embers(3, '#f6c95a')}`,

  blaze: (id) => `
    ${glow(id, '#e2622a')}
    ${tongues('#a8321a')}
    ${layer('fl-outer', 1, '#a8321a')}
    ${layer('fl-mid', 0.78, '#e2622a')}
    ${layer('fl-inner', 0.56, '#f6a33a')}
    ${layer('fl-core', 0.32, '#fff0c8')}
    ${embers(5, '#ffd27a')}`,

  golden: (id) => `
    ${glow(id, '#e8a520', 36)}
    <g class="fl-orbit">${sparkle(8, 40, 3.2, '#ffe39a')}${sparkle(57, 30, 2.6, '#ffe39a')}${sparkle(52, 70, 2.2, '#fff4cc')}</g>
    ${tongues('#c27a12')}
    ${layer('fl-outer', 1, '#c27a12')}
    ${layer('fl-mid', 0.8, '#e8a520')}
    ${layer('fl-inner', 0.58, '#ffd66b')}
    ${layer('fl-core', 0.34, '#fffbe6')}
    ${embers(6, '#fff0b0')}`,

  phoenix: (id) => `
    ${glow(id, '#d9452a', 38)}
    ${wings('#8f1d12')}
    ${layer('fl-outer', 1, '#a3261a')}
    ${layer('fl-mid', 0.8, '#e2582a')}
    ${layer('fl-inner', 0.6, '#ffb347')}
    ${layer('fl-core', 0.36, '#fff4d6')}
    ${embers(7, '#ffcf8a')}`,

  eternal: (id) => `
    ${glow(id, '#ff7a2a', 40)}
    <g class="fl-crown">${[0, 60, 120, 180, 240, 300]
      .map((a) => {
        const r = (a * Math.PI) / 180;
        return sparkle(32 + Math.cos(r) * 27, 44 + Math.sin(r) * 27, 2.6, a % 120 ? '#ffd66b' : '#fff4cc');
      })
      .join('')}</g>
    ${wings('#6e0f0a')}
    ${tongues('#c23a1a')}
    ${layer('fl-outer', 1, '#7d140c')}
    ${layer('fl-mid', 0.84, '#c23a1a')}
    ${layer('fl-inner', 0.66, '#ff8a2a')}
    ${layer('fl-inner2', 0.48, '#ffd66b')}
    ${layer('fl-core', 0.3, '#ffffff')}
    ${embers(8, '#fff0c0')}`,
};

export function fireSVG(streak) {
  const t = fireTier(streak);
  return `<svg class="fire fire--${t.key}" viewBox="0 0 64 80" aria-hidden="true">${DRAW[t.key](`fg${++uid}`)}</svg>`;
}
