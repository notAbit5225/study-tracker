// Your settings row: load it, change it, and let any part of the page react
// when it changes (e.g. the sidebar avatar updates the moment you upload one).
import { supabase } from './supabase.js';
import { tbilisiDay } from './time.js';
import { applyTheme } from './theme.js';

export const DEFAULT_TARGETS = { maths: 180, english: 90, georgian: 120 }; // minutes
export const DEFAULT_STREAK_MIN = 60;

let current = null;
const listeners = new Set();

export function getSettings() {
  return current;
}

// Subscribe to changes. Returns a function that unsubscribes (call it when
// the page that subscribed goes away, so we don't leak listeners).
export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function set(next) {
  current = next;
  applyTheme(next.theme);
  listeners.forEach((fn) => fn(next));
}

// First login on a brand-new account: create the settings row and the
// default goals. Safe to run every time – it only adds what's missing, and
// `ignoreDuplicates` means two devices logging in at once can't clash.
export async function ensureDefaults(userId) {
  const { error: sErr } = await supabase
    .from('settings')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (sErr) throw sErr;

  const { data: have, error: gErr } = await supabase.from('goal_versions').select('subject');
  if (gErr) throw gErr;
  const present = new Set(have.map((r) => r.subject));

  const defaults = { ...DEFAULT_TARGETS, streak_min: DEFAULT_STREAK_MIN };
  const today = tbilisiDay();
  const missing = Object.entries(defaults)
    .filter(([kind]) => !present.has(kind))
    .map(([subject, daily_minutes]) => ({ user_id: userId, subject, daily_minutes, effective_from: today }));

  if (missing.length) {
    const { error } = await supabase
      .from('goal_versions')
      .upsert(missing, { onConflict: 'user_id,subject,effective_from', ignoreDuplicates: true });
    if (error) throw error;
  }
}

export async function loadSettings() {
  const { data, error } = await supabase.from('settings').select('*').single();
  if (error) throw error;
  set(data);
  return data;
}

export async function updateSettings(patch) {
  const { data, error } = await supabase
    .from('settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', current.user_id)
    .select()
    .single();
  if (error) throw error;
  set(data);
  return data;
}
