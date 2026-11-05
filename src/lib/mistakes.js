// Maths mistake log. Photos live in the private "mistake-photos" bucket under
// <your user id>/…, and are shown through short-lived signed links.
import { supabase } from './supabase.js';
import { getSettings } from './settings.js';
import { shrinkImage } from './images.js';

const BUCKET = 'mistake-photos';
const FIELDS = 'id, topic, problem, photo_path, what_went_wrong, needs_resolve, resolved_at, created_at';

export async function listMistakes() {
  const { data, error } = await supabase.from('mistakes').select(FIELDS).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Signed links for many photos in one request. → Map path → url
export async function photoUrls(paths) {
  const list = paths.filter(Boolean);
  if (!list.length) return new Map();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(list, 3600);
  if (error) throw error;
  return new Map(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

async function uploadPhoto(file) {
  const blob = await shrinkImage(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${getSettings().user_id}/mistake-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  return path;
}

export async function addMistake({ topic, problem, what_went_wrong, photo }) {
  // photo first: if the upload fails, nothing half-saved is left behind
  const photo_path = photo ? await uploadPhoto(photo) : null;
  const { data, error } = await supabase
    .from('mistakes')
    .insert({
      topic: topic.trim() || null,
      problem: problem.trim() || null,
      what_went_wrong: what_went_wrong.trim() || null,
      photo_path,
    })
    .select(FIELDS)
    .single();
  if (error) {
    if (photo_path) await supabase.storage.from(BUCKET).remove([photo_path]); // tidy up
    throw error;
  }
  return data;
}

export async function setResolved(id, resolved) {
  const { error } = await supabase
    .from('mistakes')
    .update({ needs_resolve: !resolved, resolved_at: resolved ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMistake(m) {
  const { error } = await supabase.from('mistakes').delete().eq('id', m.id);
  if (error) throw error;
  if (m.photo_path) await supabase.storage.from(BUCKET).remove([m.photo_path]);
}
