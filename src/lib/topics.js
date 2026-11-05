// Topic checklist: units per subject with a status.
import { supabase } from './supabase.js';

export const STATUSES = ['not_started', 'learning', 'confident'];
export const STATUS_LABEL = { not_started: 'not started', learning: 'learning', confident: 'confident' };
export const nextStatus = (s) => STATUSES[(STATUSES.indexOf(s) + 1) % STATUSES.length];

export async function listTopics() {
  const { data, error } = await supabase
    .from('topics')
    .select('id, subject, title, status, position')
    .order('position')
    .order('id');
  if (error) throw error;
  return data;
}

export async function addTopic(subject, title, position) {
  const { data, error } = await supabase
    .from('topics')
    .insert({ subject, title: title.trim(), position })
    .select('id, subject, title, status, position')
    .single();
  if (error) throw error;
  return data;
}

export async function updateTopic(id, fields) {
  const { error } = await supabase.from('topics').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteTopic(id) {
  const { error } = await supabase.from('topics').delete().eq('id', id);
  if (error) throw error;
}
