// ═════════════════════════════════════════════════════════════════════════════
// The timer engine. No UI in here: just state, maths and database actions.
// The timer page, the tab title, the sidebar chip and the mini window all
// *subscribe* to it, so they always agree with each other.
//
// THE KEY IDEA: we never count seconds. The database row stores *when* the
// current phase started and how long it's been paused. Every second we just
// ask "what time is it now?" and calculate the rest. That's why closing the
// tab, refreshing, or switching to your phone loses nothing.
//
//   focused time  = now − phase_started_at − paused_ms − (current pause, if any)
//   remaining     = length − focused time
//
// States:  idle → study ⇄ paused → rest → waiting → (next round) study …
//          "waiting" = rest is over; nothing counts until you tap Next round.
// ═════════════════════════════════════════════════════════════════════════════
import { supabase } from './supabase.js';
import { tbilisiDay } from './time.js';
import { chime } from './sound.js';
import { notify } from './notify.js';
import { subjectLabel } from './subjects.js';

// Rest is only earned after this much real study in a block. Shorter blocks
// just get saved and the timer ends.
export const REST_UNLOCK_MIN = 45;

let row = null; // the active_timer row, or null when no timer exists
let justFinished = null; // a short block that ended on its own, for the "saved" screen
let userId = null;
let busy = false; // true while saving a finished study block
let retryAt = 0; // after a failed save, wait a bit before trying again
let worker = null;
let channel = null;
const listeners = new Set();

// ── reading the state ────────────────────────────────────────────────────────

export function snapshot(now = Date.now()) {
  if (!row) return { status: 'idle', justFinished };
  const start = Date.parse(row.phase_started_at);

  if (row.phase === 'study') {
    const pausedNow = row.paused_at ? now - Date.parse(row.paused_at) : 0;
    const lengthMs = (row.study_minutes + row.added_minutes) * 60_000;
    const focusedMs = Math.max(0, now - start - row.paused_ms - pausedNow);
    return {
      status: row.paused_at ? 'paused' : 'study',
      row,
      lengthMs,
      focusedMs: Math.min(focusedMs, lengthMs),
      remainingMs: Math.max(0, lengthMs - focusedMs),
      done: focusedMs >= lengthMs,
      restReady: focusedMs >= REST_UNLOCK_MIN * 60_000,
      // the exact moment the block ends (or ended) if it isn't paused
      endsAt: start + row.paused_ms + lengthMs,
    };
  }

  const lengthMs = row.rest_minutes * 60_000;
  const elapsed = now - start;
  return {
    status: elapsed >= lengthMs ? 'waiting' : 'rest',
    row,
    lengthMs,
    remainingMs: Math.max(0, lengthMs - elapsed),
    endsAt: start + lengthMs,
  };
}

// Subscribe to updates (every second + after every change). Returns unsubscribe.
export function onTimer(fn) {
  listeners.add(fn);
  fn(snapshot());
  return () => listeners.delete(fn);
}

function emit() {
  const s = snapshot();
  listeners.forEach((fn) => fn(s));
}

// ── starting / stopping the engine (on login / logout) ───────────────────────

export async function startTimerEngine(uid) {
  userId = uid;
  await refresh();

  worker = new Worker(new URL('./tick.worker.js', import.meta.url));
  worker.onmessage = tick;

  // Realtime: hear changes made on your other device right away.
  channel = supabase
    .channel('active-timer')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'active_timer' }, refresh)
    .subscribe();

  // Backup for realtime: re-check whenever you come back to the tab.
  document.addEventListener('visibilitychange', onVisible);
}

export function stopTimerEngine() {
  worker?.terminate();
  worker = null;
  if (channel) supabase.removeChannel(channel);
  channel = null;
  document.removeEventListener('visibilitychange', onVisible);
  row = null;
  userId = null;
  emit();
}

function onVisible() {
  if (document.visibilityState === 'visible') refresh();
}

async function refresh() {
  const { data, error } = await supabase.from('active_timer').select('*').maybeSingle();
  if (error) return console.error(error);
  row = data;
  emit();
}

// ── the once-a-second check ──────────────────────────────────────────────────

function tick() {
  const s = snapshot();
  emit();
  if (busy || Date.now() < retryAt) return;

  if (s.status === 'study' && s.done) finishStudyBlock(s);
  else if (s.status === 'waiting') announce('rest-done', s.endsAt, "Rest's over", 'Tap Next round when you\'re back.');
}

// Plays the chime + shows the notification, once per phase end, and only if
// it ended in the last 90 s (opening the laptop hours later shouldn't ding).
function announce(kind, endsAt, title, body) {
  const key = `desk-announced-${kind}-${endsAt}`;
  if (Date.now() - endsAt > 90_000) return;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
  chime(kind);
  notify(title, body);
}

// Study block reached its full length: save it, then rest (if it was 45m+)
// or end the timer (if it was shorter).
async function finishStudyBlock(s) {
  busy = true;
  const r = s.row;
  const endedAt = new Date(s.endsAt).toISOString();
  const minutes = r.study_minutes + r.added_minutes;
  try {
    await saveSession({
      subject: r.subject,
      started_at: r.phase_started_at,
      ended_at: endedAt,
      focused_seconds: minutes * 60,
      planned_minutes: minutes,
      distractions: r.distractions,
    });

    if (minutes >= REST_UNLOCK_MIN) {
      // Rest starts exactly when study ended, not "now".
      await switchToRest(r, endedAt);
      announce('study-done', s.endsAt, `${subjectLabel(r.subject)} block done`, `${r.rest_minutes} minutes of rest. Stand up for a bit.`);
    } else {
      // Short block: no rest. Remove the timer, but only if it's still this
      // same block (your other device might have started a new one already).
      const { error } = await supabase
        .from('active_timer')
        .delete()
        .eq('user_id', userId)
        .eq('phase_started_at', r.phase_started_at);
      if (error) throw error;
      row = null;
      justFinished = { subject: r.subject, minutes, distractions: r.distractions };
      announce('study-done', s.endsAt, `${subjectLabel(r.subject)} block done`, `Saved ${minutes}m. Short one, so no rest.`);
    }
  } catch (err) {
    console.error(err);
    retryAt = Date.now() + 10_000;
  } finally {
    busy = false;
    emit();
  }
}

// Study → rest, starting at `restStartedAt`. The .eq() filters make this a
// no-op if your other device already did it (or started something new).
async function switchToRest(r, restStartedAt) {
  const { data, error } = await supabase
    .from('active_timer')
    .update({
      phase: 'rest',
      phase_started_at: restStartedAt,
      paused_at: null,
      paused_ms: 0,
      added_minutes: 0,
      distractions: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('phase', 'study')
    .eq('phase_started_at', r.phase_started_at)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (data) {
    row = data;
    emit();
  } else await refresh();
}

async function saveSession(fields) {
  const { error } = await supabase.from('study_sessions').upsert(
    {
      user_id: userId,
      day: tbilisiDay(new Date(fields.started_at)), // counts for the day you started
      ...fields,
    },
    { onConflict: 'user_id,started_at', ignoreDuplicates: true },
  );
  if (error) throw error;
}

// ── actions (called by buttons) ──────────────────────────────────────────────

async function patch(fields) {
  const { data, error } = await supabase
    .from('active_timer')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  row = data;
  emit();
}

export async function startTimer({ subject, studyMinutes, restMinutes }) {
  justFinished = null;
  const { data, error } = await supabase
    .from('active_timer')
    .upsert({
      user_id: userId,
      subject,
      phase: 'study',
      study_minutes: studyMinutes,
      rest_minutes: restMinutes,
      added_minutes: 0,
      phase_started_at: new Date().toISOString(),
      paused_at: null,
      paused_ms: 0,
      distractions: 0,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  row = data;
  emit();
}

export function pause() {
  return patch({ paused_at: new Date().toISOString() });
}

export function resume() {
  const pausedFor = Date.now() - Date.parse(row.paused_at);
  return patch({ paused_at: null, paused_ms: row.paused_ms + pausedFor });
}

export function addTime(minutes) {
  return patch({ added_minutes: row.added_minutes + minutes });
}

export function distracted(delta = 1) {
  return patch({ distractions: Math.max(0, row.distractions + delta) });
}

// Stop the study block early. Whatever you studied is saved (if ≥ 1 minute).
// Returns what was saved so the page can show it.
export async function finishNow() {
  const s = snapshot();
  const r = s.row;
  const minutes = Math.floor(s.focusedMs / 60_000);
  if (minutes >= 1) {
    await saveSession({
      subject: r.subject,
      started_at: r.phase_started_at,
      ended_at: r.paused_at ?? new Date().toISOString(),
      focused_seconds: Math.floor(s.focusedMs / 1000),
      planned_minutes: r.study_minutes + r.added_minutes,
      distractions: r.distractions,
    });
  }
  await stop();
  return { subject: r.subject, minutes, distractions: r.distractions };
}

// "Rest now": after 45m+ of study you can stop the block early and rest.
// What you studied so far is saved; the rest of the planned time is dropped.
export async function restNow() {
  const s = snapshot();
  if (!s.restReady) return;
  const r = s.row;
  const endedAt = r.paused_at ?? new Date().toISOString();
  await saveSession({
    subject: r.subject,
    started_at: r.phase_started_at,
    ended_at: endedAt,
    focused_seconds: Math.floor(s.focusedMs / 1000),
    planned_minutes: r.study_minutes + r.added_minutes,
    distractions: r.distractions,
  });
  await switchToRest(r, new Date().toISOString());
}

// The "saved" screen has shown the short block; forget it.
export function clearJustFinished() {
  justFinished = null;
}

// Start the next study block (from rest or from "waiting"). Same lengths as
// before; you can switch subject.
export function nextRound(subject = row.subject) {
  return patch({
    subject,
    phase: 'study',
    phase_started_at: new Date().toISOString(),
    paused_at: null,
    paused_ms: 0,
    added_minutes: 0,
    distractions: 0,
  });
}

// Delete the timer row: back to the setup screen. Saved sessions stay saved.
export async function stop() {
  const { error } = await supabase.from('active_timer').delete().eq('user_id', userId);
  if (error) throw error;
  row = null;
  emit();
}
