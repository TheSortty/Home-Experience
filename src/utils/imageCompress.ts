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
