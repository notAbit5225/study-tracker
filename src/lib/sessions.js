// Reading and annotating saved study sessions.
import { supabase } from './supabase.js';
import { tbilisiDay } from './time.js';

// Minutes studied per subject on one day.
export async function totalsForDay(day = tbilisiDay()) {
  const { data, error } = await supabase.from('study_sessions').select('subject, focused_seconds').eq('day', day);
  if (error) throw error;
  const totals = { maths: 0, english: 0, georgian: 0 };
  data.forEach((r) => (totals[r.subject] += r.focused_seconds / 60));
  return totals;
}

// The most recently finished session (for the "what did you study?" note).
// Asking the database instead of remembering it locally means it also works
// when your *other* device was the one that saved it.
export async function latestSession() {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('id, subject, focused_seconds, note, ended_at')
    .order('ended_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveNote(id, note) {
  const { error } = await supabase
    .from('study_sessions')
    .update({ note: note.trim() || null })
    .eq('id', id);
  if (error) throw error;
}
