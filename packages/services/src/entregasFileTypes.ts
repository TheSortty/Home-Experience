// Formatos y límites aceptados en entregas y devoluciones.
//
// Vive aparte de entregasStorage.ts (que importa @opennextjs/cloudflare y por
// eso sólo corre en el servidor) para que los componentes de cliente puedan
// validar con exactamente la misma lista que valida el server action.

export const MAX_FILE_BYTES = 5 * 1024 * 1024;        // 5 MB por archivo
export const MAX_FILES_PER_SUBMISSION = 8;

/** Tipos aceptados (PDF / Word + documentos e imágenes comunes). */
export const ALLOWED_EXTENSIONS = [
  // Documentos
  'pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'csv',
  'ppt', 'pptx', 'xls', 'xlsx',
  // Imágenes (incluye formatos de celular/web que antes se rechazaban)
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp', 'tif', 'tiff',
] as const;

export function isAllowedFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Valor del atributo `accept` para escritorio: tipos MIME *y* extensiones.
 * Los MIME son lo único que entienden los selectores nativos; las extensiones,
 * lo único que entienden algunos diálogos de escritorio.
 */
export const FILE_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/*',
  ...ALLOWED_EXTENSIONS.map(e => `.${e}`),
].join(',');
