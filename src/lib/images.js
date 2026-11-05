// Shrinking photos in the browser before upload, with a <canvas>.
// A phone camera photo (4000×3000, ~4 MB) becomes ~1600 px wide and a few
// hundred KB – faster to upload, cheaper to store, still sharp enough to read.

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Fit inside max×max, keep the shape. Returns a Blob (webp, or jpeg on
// browsers that can't make webp).
export async function shrinkImage(file, max = 1600, quality = 0.82) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  const webp = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
  if (webp && webp.type === 'image/webp') return webp;
  return new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
}
