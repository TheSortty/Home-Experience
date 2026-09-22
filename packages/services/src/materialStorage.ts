// Cloudflare R2 storage para el material que cargan los coaches/organizadores.
//
// Hay dos naturalezas distintas y por eso dos buckets:
//
//   · Material descargable (PRIVADO) → bucket campus-entregas (binding ENTREGAS).
//     Nunca es público: se sirve por /api/materiales/download, que autoriza con
//     el RLS del alumno (o sea, sólo si tiene acceso al curso).
//         materiales/{courseId}/{lessonId}/{fileId}__{nombre}
//
//   · Imágenes (PÚBLICAS: portadas de curso) → bucket campus-avatars
//     (binding AVATARS), que ya está expuesto en el dominio público r2.dev y
//     habilitado en el CSP / next.config.js.
//         portadas/{courseId}/{fileId}.{ext}
//
// Las claves quedan clasificadas por curso/clase para poder purgar por prefijo.

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sanitizeFileName } from './entregasStorage';

/** URL pública del bucket campus-avatars (mismo que usan los avatares). */
export const R2_PUBLIC_URL = 'https://pub-a623949342a84338a70f5a9f083bcc04.r2.dev';

// ── Límites ────────────────────────────────────────────────────────────────────

export const MAX_MATERIAL_BYTES = 25 * 1024 * 1024;   // 25 MB por archivo
export const MAX_MATERIAL_FILES = 5;                  // por tanda de subida
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;       // 5 MB por imagen

/** Formatos aceptados como material descargable. */
export const ALLOWED_MATERIAL_EXTENSIONS = [
  // Documentos
  'pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'csv',
  'ppt', 'pptx', 'odp', 'xls', 'xlsx', 'ods',
  // Imágenes
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'svg',
  // Audio (guías, meditaciones)
  'mp3', 'm4a', 'wav', 'ogg',
  // Comprimidos
  'zip',
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif',
] as const;

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function isAllowedMaterial(fileName: string): boolean {
  return (ALLOWED_MATERIAL_EXTENSIONS as readonly string[]).includes(extensionOf(fileName));
}

export function isAllowedImage(fileName: string): boolean {
  return (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extensionOf(fileName));
}

// ── Claves ─────────────────────────────────────────────────────────────────────

export function buildMaterialKey(p: {
  courseId: string;
  lessonId: string;
  fileId: string;
  fileName: string;
}): string {
  return `materiales/${p.courseId}/${p.lessonId}/${p.fileId}__${sanitizeFileName(p.fileName)}`;
}

export function buildCourseImageKey(p: {
  courseId: string;
  fileId: string;
  fileName: string;
}): string {
  const ext = extensionOf(p.fileName) || 'jpg';
  return `portadas/${p.courseId}/${p.fileId}.${ext}`;
}

/** Sólo las claves que generamos nosotros son descargables por la ruta autenticada. */
export function isMaterialKey(key: string): boolean {
  return key.startsWith('materiales/');
}

// ── Buckets ────────────────────────────────────────────────────────────────────

async function getPrivateBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as { ENTREGAS: R2Bucket }).ENTREGAS;
}

async function getPublicBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as { AVATARS: R2Bucket }).AVATARS;
}

/** Sube material privado. Lanza si falla (el caller traduce el error). */
export async function putMaterialObject(
  key: string,
  body: ArrayBuffer,
  contentType: string | null,
): Promise<void> {
  const bucket = await getPrivateBucket();
  await bucket.put(key, body, {
    httpMetadata: { contentType: contentType || 'application/octet-stream' },
  });
}

export async function getMaterialObject(key: string): Promise<R2ObjectBody | null> {
  const bucket = await getPrivateBucket();
  return bucket.get(key);
}

/** Borrado best-effort de material. Nunca lanza — se usa en limpieza. */
export async function deleteMaterialObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const bucket = await getPrivateBucket();
    await bucket.delete(keys);
  } catch (err) {
    console.error('[R2] delete material error:', err);
  }
}

/** Sube una imagen pública y devuelve su URL definitiva (con cache-buster). */
export async function putPublicImage(
  key: string,
  body: ArrayBuffer,
  contentType: string | null,
): Promise<string> {
  const bucket = await getPublicBucket();
  await bucket.put(key, body, {
    httpMetadata: { contentType: contentType || 'image/jpeg' },
  });
  return `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`;
}

/** Borrado best-effort de una imagen pública subida por nosotros. */
export async function deletePublicImage(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith(`${R2_PUBLIC_URL}/portadas/`)) return;
  try {
    const key = new URL(url).pathname.replace(/^\//, '');
    const bucket = await getPublicBucket();
    await bucket.delete(key);
  } catch (err) {
    console.error('[R2] delete image error:', err);
  }
}
