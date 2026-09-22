/**
 * compressToWebP
 * Crops the image to a square (center crop), resizes to targetPx × targetPx,
 * and encodes as WebP at the given quality.
 * Runs entirely in the browser via Canvas — nothing leaves the client before upload.
 */
export async function compressToWebP(
  file: File,
  targetPx = 400,
  quality = 0.82,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Center-crop to square
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = targetPx;
      canvas.height = targetPx;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not available'));

      ctx.drawImage(img, sx, sy, side, side, 0, 0, targetPx, targetPx);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression failed'));
          resolve(new File([blob], 'avatar.webp', { type: 'image/webp' }));
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * compressImageIfNeeded
 * Downscales + re-encodes a raster image as JPEG when it's over `maxBytes`,
 * stepping down quality (and, if still too big, dimensions) until it fits.
 * Used for entrega/devolución uploads: phone cameras and WhatsApp's "HD"
 * media setting routinely produce photos over the 5 MB per-file cap.
 * Non-image files, files already under the limit, and formats the canvas
 * can't decode (HEIC/HEIF — common straight off iPhones) pass through as-is;
 * the server-side size check still applies as the final backstop.
 */
export async function compressImageIfNeeded(
  file: File,
  maxBytes = 5 * 1024 * 1024,
  maxDimension = 2400,
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/heic' || file.type === 'image/heif') {
    return file;
  }
  if (file.size <= maxBytes) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo leer la imagen'));
      el.src = objectUrl;
    });

    let scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    let quality = 0.85;

    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', quality));
      if (!blob) return file;

      if (blob.size <= maxBytes) {
        const name = file.name.replace(/\.\w+$/, '') + '.jpg';
        return new File([blob], name, { type: 'image/jpeg' });
      }

      // Still too big: drop quality first, then shrink dimensions further.
      if (quality > 0.4) quality -= 0.15;
      else scale *= 0.75;
    }

    return file; // Gave up — server-side check will reject with a clear message.
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
