// A soft chime made with the Web Audio API: no sound file to download.
// Each note is a sine wave that fades in fast and out slowly, like a bell.
//
// Browsers only allow sound after you've clicked/tapped the page at least once
// ("autoplay policy"). unlockAudio() is called on your first tap after load.
let ctx = null;

export function unlockAudio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
}

// 'study-done' rises (time to rest), 'rest-done' is a three-note "back to it".
const TUNES = {
  'study-done': [659.25, 880],
  'rest-done': [523.25, 659.25, 783.99],
};

export function chime(kind) {
  if (!ctx) return; // never tapped yet: stay silent, the notification still shows
  const notes = TUNES[kind];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.28;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.9);
  });
}
