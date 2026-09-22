// Helpers client-safe para el material descargable guardado en R2.
//
// El archivo nunca se sirve público: `file_url` de lesson_resources apunta a la
// ruta autenticada, que valida el acceso al curso vía RLS y hace el stream
// desde el bucket. Guardamos la URL ya armada en la fila para que todo el
// render existente (admin y campus) siga funcionando sin cambios.

export function materialDownloadHref(storageKey: string): string {
  return `/api/materiales/download?key=${encodeURIComponent(storageKey)}`;
}

/** Igual, pero servido inline para poder previsualizar PDFs/imágenes. */
export function materialPreviewHref(storageKey: string): string {
  return `/api/materiales/download?key=${encodeURIComponent(storageKey)}&inline=1`;
}

/** Si la URL es de un archivo nuestro en R2, devuelve su clave; si no, null. */
export function materialKeyFromHref(fileUrl: string): string | null {
  if (!fileUrl.startsWith('/api/materiales/download')) return null;
  const query = fileUrl.slice(fileUrl.indexOf('?') + 1);
  const key = new URLSearchParams(query).get('key');
  return key || null;
}

/** Categoría que se guarda en lesson_resources.type (icono + etiqueta en la UI). */
export function materialTypeOf(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['mp3', 'm4a', 'wav', 'ogg'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'svg'].includes(ext)) return 'imagen';
  if (['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext)) return 'documento';
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'planilla';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'presentación';
  return 'archivo';
}
