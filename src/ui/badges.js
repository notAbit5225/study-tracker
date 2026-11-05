// The six milestone badges, as one escalating series: copper → brass →
// ember-and-gold → gold with a ruby → gold crest → crowned obsidian star.
// Each tier adds detail (rims, gems, rays, banners) so the later ones feel
// properly rare.
//
// Drawn as SVG with gradients for the metal. Every badge gets its own id
// prefix, because two badges on the same page can't share gradient ids.
const C = 60;
const f = (n) => n.toFixed(1);
const pt = (r, deg, cx = C, cy = C) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

// zig-zag ring: n points alternating between two radii
const zigzag = (n, r1, r2, cx = C, cy = C, turn = 0) =>
  Array.from({ length: n }, (_, i) => pt(i % 2 ? r2 : r1, (360 / n) * i + turn, cx, cy).map(f).join(',')).join(' ');

// thin rays from the centre, for the rare ones
const rays = (n, r1, r2, width, fill, cx = C, cy = C) =>
  Array.from({ length: n }, (_, i) => {
    const deg = (360 / n) * i;
    const [ax, ay] = pt(r1, deg - width, cx, cy);
    const [bx, by] = pt(r2, deg, cx, cy);
    const [cx2, cy2] = pt(r1, deg + width, cx, cy);
    return `<path d="M${f(ax)} ${f(ay)} L${f(bx)} ${f(by)} L${f(cx2)} ${f(cy2)} Z" fill="${fill}"/>`;
  }).join('');

const sparkle = (x, y, s, fill, cls = '') =>
  `<path class="${cls}" d="M${x} ${y - s} L${x + s * 0.25} ${y - s * 0.25} L${x + s} ${y} L${x + s * 0.25} ${y + s * 0.25} L${x} ${y + s} L${x - s * 0.25} ${y + s * 0.25} L${x - s} ${y} L${x - s * 0.25} ${y - s * 0.25} Z" fill="${fill}"/>`;

const gem = (x, y, s, id) => `
  <path d="M${x} ${y - s} L${x + s * 0.8} ${y} L${x} ${y + s} L${x - s * 0.8} ${y} Z" fill="url(#${id}-ruby)" stroke="#5a0f0a" stroke-width=".8"/>
  <path d="M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.1} L${x} ${y + s * 0.2} L${x - s * 0.3} ${y - s * 0.1} Z" fill="rgba(255,235,225,.55)"/>`;

// shared gradients, prefixed per badge
const defs = (id) => `
  <defs>
    <linearGradient id="${id}-cu" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0b27f"/><stop offset=".45" stop-color="#b8673a"/><stop offset="1" stop-color="#6e3416"/>
    </linearGradient>
    <linearGradient id="${id}-brass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7dc8a"/><stop offset=".5" stop-color="#c2921c"/><stop offset="1" stop-color="#6f4f06"/>
    </linearGradient>
    <linearGradient id="${id}-gold" x1="0" y1="0" x2=".9" y2="1">
      <stop offset="0" stop-color="#fff1bf"/><stop offset=".35" stop-color="#e6b437"/><stop offset=".7" stop-color="#b8860b"/><stop offset="1" stop-color="#6f4f06"/>
    </linearGradient>
    <linearGradient id="${id}-ember" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d9622e"/><stop offset=".55" stop-color="#9e3a14"/><stop offset="1" stop-color="#4e1a08"/>
    </linearGradient>
    <linearGradient id="${id}-ruby" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff8a78"/><stop offset=".5" stop-color="#c42a1e"/><stop offset="1" stop-color="#5a0f0a"/>
    </linearGradient>
    <radialGradient id="${id}-obsidian" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="#4a362a"/><stop offset="1" stop-color="#0e0906"/>
    </radialGradient>
    <linearGradient id="${id}-shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>`;

const ENGRAVED_FLAME = 'M60 26 C62 32 67 35 67 41 C67 47 63 50 60 50 C57 50 53 47 53 42 C53 38 56 36 57 32 C58 35 59 37 59 39 C61 36 61 31 60 26 Z';

// ── 10: copper token ─────────────────────────────────────────────────────────
function m10(id) {
  return `
    <g class="b-body">
      <circle cx="60" cy="60" r="48" fill="url(#${id}-cu)"/>
      <circle cx="60" cy="60" r="46" fill="none" stroke="#5e2a10" stroke-width="4" stroke-dasharray="1.3 2.2" opacity=".7"/>
      <circle cx="60" cy="60" r="39" fill="none" stroke="#ffd9b8" stroke-width="1" opacity=".55"/>
      <circle cx="60" cy="60" r="36" fill="none" stroke="#5e2a10" stroke-width="1" opacity=".5"/>
      <path d="${ENGRAVED_FLAME}" fill="#5e2a10" opacity=".45" transform="translate(0 -6) scale(1) "/>
      <text x="60" y="77" class="b-num" fill="#fbe3cc" stroke="#5e2a10" stroke-width=".6" font-size="30">10</text>
      <text x="60" y="89" class="b-small" fill="#fbe3cc" opacity=".85">DAYS</text>
      <path d="M26 44 A36 36 0 0 1 52 22" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>
    </g>`;
}

// ── 30: brass rosette ────────────────────────────────────────────────────────
function m30(id) {
  return `
    <g class="b-tails">
      <path d="M46 74 L34 116 L44 109 L50 118 L58 80 Z" fill="#7a2e10"/>
      <path d="M41 98 L44 86" stroke="#f3e6cc" stroke-width="2" opacity=".6"/>
      <path d="M74 74 L86 116 L76 109 L70 118 L62 80 Z" fill="#9e3a14"/>
      <path d="M79 98 L76 86" stroke="#f3e6cc" stroke-width="2" opacity=".6"/>
    </g>
    <g class="b-spin">
      <polygon points="${zigzag(36, 50, 43, 60, 54)}" fill="#7a2e10"/>
      <polygon points="${zigzag(28, 44, 37, 60, 54, 6)}" fill="#c0652a"/>
      <circle cx="60" cy="54" r="32" fill="url(#${id}-brass)"/>
      <circle cx="60" cy="54" r="32" fill="none" stroke="#fff1bf" stroke-width="1.5" opacity=".7"/>
      <circle cx="60" cy="54" r="27" fill="none" stroke="#6f4f06" stroke-width="1.1" stroke-dasharray="2 2.5"/>
      ${sparkle(60, 33, 4, '#fff6d6')}
      <text x="60" y="66" class="b-num" fill="#3b2a1f" font-size="25">30</text>
      <path d="M36 42 A27 27 0 0 1 52 29" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".45"/>
    </g>`;
}

// ── 50: ember wax seal with gold leaf ────────────────────────────────────────
function m50(id) {
  const blob = Array.from({ length: 18 }, (_, i) => pt(45 + (i % 3 === 0 ? 4 : i % 2 ? -2 : 2), 20 * i + 7))
    .map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`)
    .join(' ');
  return `
    <g class="b-body">
      <path d="M44 100 C44 110 50 114 52 104 Z M78 98 C80 112 86 110 84 98 Z" fill="#6e2a0e"/>
      <path d="${blob} Z" fill="url(#${id}-ember)" stroke="#7a2e10" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="60" cy="60" r="33" fill="none" stroke="url(#${id}-gold)" stroke-width="3"/>
      <circle cx="60" cy="60" r="29" fill="none" stroke="#e6b437" stroke-width=".9" stroke-dasharray="1 2.4"/>
      ${[200, 240, 280, 320, 40, 80, 120, 160]
        .map((d) => {
          const [x, y] = pt(33, d);
          return `<circle cx="${f(x)}" cy="${f(y)}" r="1.6" fill="#ffe39a"/>`;
        })
        .join('')}
      <path d="${ENGRAVED_FLAME}" fill="url(#${id}-gold)" transform="translate(60 38) scale(.55) translate(-60 -38)"/>
      <text x="60" y="78" class="b-num" fill="url(#${id}-gold)" font-size="27">50</text>
      <path d="M33 44 Q40 30 54 26" stroke="rgba(255,220,190,.4)" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>`;
}

// ── 100: gold medal with a ruby, on a striped ribbon, rays behind ────────────
function m100(id) {
  return `
    <g class="b-rays">${rays(18, 30, 58, 3.2, '#e6b437', 60, 74)}</g>
    <g class="b-medal">
      <path d="M36 0 L50 46 L60 42 L70 46 L84 0 Z" fill="#9e3a14"/>
      <path d="M44 0 L55 38 M52 0 L58 30 M76 0 L65 38 M68 0 L62 30" stroke="#f3e6cc" stroke-width="2.4"/>
      <rect x="46" y="40" width="28" height="8" rx="2" fill="url(#${id}-gold)" stroke="#6f4f06" stroke-width=".8"/>
      <g class="b-disc">
        <circle cx="60" cy="78" r="35" fill="url(#${id}-gold)"/>
        <circle cx="60" cy="78" r="35" fill="none" stroke="#6f4f06" stroke-width="1.5"/>
        <circle cx="60" cy="78" r="30" fill="none" stroke="#fff1bf" stroke-width="1.2" opacity=".8"/>
        <circle cx="60" cy="78" r="26" fill="none" stroke="#8a6408" stroke-width="1"/>
        ${Array.from({ length: 6 }, (_, i) => {
          const [x, y] = pt(22, 130 + i * 20, 60, 78);
          const [x2, y2] = pt(22, 230 - i * 20, 60, 78);
          return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="2" ry="4.5" fill="#8a6408" transform="rotate(${f(130 + i * 20 + 40)} ${f(x)} ${f(y)})"/><ellipse cx="${f(x2)}" cy="${f(y2)}" rx="2" ry="4.5" fill="#8a6408" transform="rotate(${f(230 - i * 20 - 40)} ${f(x2)} ${f(y2)})"/>`;
        }).join('')}
        <text x="60" y="86" class="b-num" fill="#3b2a1f" font-size="23">100</text>
        ${gem(60, 54, 6, id)}
        <path d="M33 66 A30 30 0 0 1 50 50" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>
      </g>
    </g>`;
}

// ── 150: gold shield crest in a laurel wreath, two rubies, a banner ──────────
function m150(id) {
  const leaves = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const deg = 180 + side * (40 + i * 18);
      const [x, y] = pt(47, deg, 60, 58);
      leaves.push(
        `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(deg + side * 30)})"><ellipse class="b-leaf" style="--i:${i}" rx="5" ry="11" fill="${i % 2 ? '#e6b437' : '#b8860b'}" stroke="#6f4f06" stroke-width=".6"/></g>`,
      );
    }
  }
  return `
    ${leaves.join('')}
    <g class="b-body">
      <path d="M60 18 L88 28 L86 62 C84 80 72 92 60 98 C48 92 36 80 34 62 L32 28 Z" fill="url(#${id}-gold)" stroke="#6f4f06" stroke-width="1.5"/>
      <path d="M60 25 L82 33 L80 61 C78 76 69 86 60 91 C51 86 42 76 40 61 L38 33 Z" fill="url(#${id}-obsidian)"/>
      <path d="M60 25 L82 33 L80 61 C78 76 69 86 60 91 C51 86 42 76 40 61 L38 33 Z" fill="none" stroke="#e6b437" stroke-width=".8" stroke-dasharray="1.5 2"/>
      <path d="${ENGRAVED_FLAME}" fill="url(#${id}-gold)" transform="translate(60 40) scale(.6) translate(-60 -38)"/>
      <text x="60" y="72" class="b-num" fill="url(#${id}-gold)" font-size="22">150</text>
      ${gem(38, 30, 4.5, id)}${gem(82, 30, 4.5, id)}
    </g>
    <g class="b-banner">
      <path d="M22 96 L34 92 L34 108 L22 112 L27 104 Z M98 96 L86 92 L86 108 L98 112 L93 104 Z" fill="#7a2e10"/>
      <path d="M32 92 Q60 102 88 92 L88 108 Q60 118 32 108 Z" fill="#c0652a" stroke="#7a2e10" stroke-width="1"/>
      <text x="60" y="108" class="b-small" fill="#fbecc8">DAYS</text>
    </g>`;
}

// ── 200: crowned obsidian star crest with rays, rubies and sparkles ──────────
function m200(id) {
  const star8 = zigzag(16, 50, 30, 60, 64);
  return `
    <g class="b-rays">${rays(24, 34, 60, 2.2, '#ffd66b', 60, 64)}</g>
    <g class="b-star8"><polygon points="${star8}" fill="url(#${id}-gold)" stroke="#6f4f06" stroke-width="1"/></g>
    <g class="b-body">
      <circle cx="60" cy="64" r="30" fill="url(#${id}-obsidian)"/>
      <circle cx="60" cy="64" r="30" fill="none" stroke="url(#${id}-gold)" stroke-width="3"/>
      <circle cx="60" cy="64" r="25" fill="none" stroke="#e6b437" stroke-width=".8" stroke-dasharray="1 2.2"/>
      ${[[48, 52], [70, 50], [76, 66], [45, 74], [62, 80]].map(([x, y], i) => `<circle class="b-twinkle" style="--i:${i}" cx="${x}" cy="${y}" r="${i % 2 ? 1 : 1.5}" fill="#fbecc8"/>`).join('')}
      <text x="60" y="73" class="b-num" fill="url(#${id}-gold)" font-size="24">200</text>
    </g>
    <g class="b-crown">
      <path d="M40 32 L44 14 L52 24 L60 8 L68 24 L76 14 L80 32 Z" fill="url(#${id}-gold)" stroke="#6f4f06" stroke-width="1.2" stroke-linejoin="round"/>
      <rect x="39" y="30" width="42" height="6" rx="1.5" fill="url(#${id}-gold)" stroke="#6f4f06" stroke-width="1"/>
      ${gem(60, 22, 3.6, id)}${gem(47, 26, 2.6, id)}${gem(73, 26, 2.6, id)}
      <circle cx="44" cy="14" r="2" fill="#fff1bf"/><circle cx="60" cy="8" r="2.2" fill="#fff1bf"/><circle cx="76" cy="14" r="2" fill="#fff1bf"/>
    </g>
    ${sparkle(14, 30, 4, '#fff1bf', 'b-spark')}${sparkle(106, 40, 3.2, '#fff1bf', 'b-spark')}${sparkle(100, 104, 3.6, '#ffe39a', 'b-spark')}${sparkle(18, 98, 2.8, '#ffe39a', 'b-spark')}`;
}

const DRAW = { 10: m10, 30: m30, 50: m50, 100: m100, 150: m150, 200: m200 };
let uid = 0;

export function badgeSVG(days) {
  const id = `bd${++uid}`;
  return `<svg class="badge badge--m${days}" viewBox="0 0 120 120" aria-hidden="true">${defs(id)}${DRAW[days](id)}</svg>`;
}
