// Cloudflare R2 storage for course deliveries ("entregas").
//
// Bucket: campus-entregas (binding ENTREGAS — see wrangler.jsonc). Private:
// objects are never public, they are streamed through an authenticated route
// handler (/api/entregas/download). Object keys are classified by
// course/lesson/student so a whole course, lesson, student or version can be
// purged by prefix to stay under the free 10 GB tier:
//
//   entregas/{courseId}/{lessonId}/{studentProfileId}/v{version}/{fileId}__{name}
//   reviews/{courseId}/{lessonId}/{studentProfileId}/v{version}/{fileId}__{name}

import { getCloudflareContext } from '@opennextjs/cloudflare';

// ── Upload constraints ─────────────────────────────────────────────────────────
// Definidas en entregasFileTypes.ts para que el cliente valide con la misma
// lista; se re-exportan acá para no tocar los imports existentes.

export {
  MAX_FILE_BYTES, MAX_FILES_PER_SUBMISSION, ALLOWED_EXTENSIONS, isAllowedFile,
} from './entregasFileTypes';

// ── Key builders ────────────────────────────────────────────────────────────────

/** Strip path separators / unsafe chars from a file name for use in an R2 key. */
export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 120) || 'archivo';
}

interface KeyParts {
  courseId: string;
  lessonId: string;
  studentProfileId: string;
  version: number;
  fileId: string;
  fileName: string;
}

export function buildSubmissionKey(p: KeyParts): string {
  return `entregas/${p.courseId}/${p.lessonId}/${p.studentProfileId}/v${p.version}/${p.fileId}__${sanitizeFileName(p.fileName)}`;
}

export function buildReviewKey(p: KeyParts): string {
  return `reviews/${p.courseId}/${p.lessonId}/${p.studentProfileId}/v${p.version}/${p.fileId}__${sanitizeFileName(p.fileName)}`;
}

// ── Bucket access ────────────────────────────────────────────────────────────────

export async function getEntregasBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as { ENTREGAS: R2Bucket }).ENTREGAS;
}

/** Upload bytes to R2. Throws on failure (caller maps to a user-facing error). */
export async function putEntregaObject(
  key: string,
  body: ArrayBuffer,
  contentType: string | null,
): Promise<void> {
  const bucket = await getEntregasBucket();
  await bucket.put(key, body, {
    httpMetadata: { contentType: contentType || 'application/octet-stream' },
  });
}

/** Best-effort delete of many keys. Never throws — used during cleanup. */
export async function deleteEntregaObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const bucket = await getEntregasBucket();
    await bucket.delete(keys);
  } catch (err) {
    console.error('[R2] delete error:', err);
  }
}
