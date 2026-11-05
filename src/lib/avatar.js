// Profile picture: validate → square-crop + shrink in the browser → upload to
// the private "avatars" bucket → remember its path in settings.
import { supabase } from './supabase.js';
import { getSettings, updateSettings } from './settings.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024; // the ~2 MB rule
const SIZE = 512; // final picture is 512×512 px – plenty for a circle

// The bucket is private, so there's no public link to the file. Instead we ask
// Supabase for a *signed* URL: a temporary link (1 hour) that only works because
// you're logged in. We cache it so we don't ask again on every page change.
const urlCache = new Map();

export async function getAvatarUrl(path) {
  if (!path) return null;
  const hit = urlCache.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
  if (error) return null;
  urlCache.set(path, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

// Returns an error message (string) if the file isn't OK, otherwise null.
export function checkFile(file) {
  if (!ALLOWED.includes(file.type)) return "That's not a jpg, png or webp.";
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `That one's ${mb} MB. Max is 2 MB.`;
  }
  return null;
}

// Crop the middle square out of the photo and shrink it to 512×512 using a
// <canvas>. A 1.8 MB phone photo becomes ~40 KB, so it loads instantly.
async function toSquareWebp(file) {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88));
}

export async function uploadAvatar(file) {
  const problem = checkFile(file);
  if (problem) throw new Error(problem);

  const settings = getSettings();
  const blob = await toSquareWebp(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'png'; // older browsers can't make webp

  // Files live in a folder named after your user id – the storage policy in
  // 001_init.sql only lets you touch your own folder. A new filename each time
  // means browsers can't show an old cached picture.
  const path = `${settings.user_id}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;

  const old = settings.avatar_path;
  await updateSettings({ avatar_path: path });
  if (old) await supabase.storage.from('avatars').remove([old]); // tidy up
}

export async function removeAvatar() {
  const old = getSettings().avatar_path;
  await updateSettings({ avatar_path: null });
  if (old) await supabase.storage.from('avatars').remove([old]);
}
