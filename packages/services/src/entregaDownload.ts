// Client-safe helper: builds the URL for the authenticated delivery-file
// download route. The route (app/api/entregas/download/route.ts) authorizes
// via RLS and streams the object from R2.

export function entregaDownloadHref(storageKey: string): string {
  return `/api/entregas/download?key=${encodeURIComponent(storageKey)}`;
}

/** Same object, but served inline so it can be previewed in an <iframe>/<img>. */
export function entregaPreviewHref(storageKey: string): string {
  return `/api/entregas/download?key=${encodeURIComponent(storageKey)}&inline=1`;
}

/** Whether a file can be previewed inline (PDF or image). */
export function isPreviewable(fileName: string, contentType?: string | null): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return true;
  if (contentType && (contentType === 'application/pdf' || contentType.startsWith('image/'))) return true;
  return false;
}
