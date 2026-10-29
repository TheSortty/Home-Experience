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
 * Copia a memoria los archivos recién elegidos. El navegador lee el archivo
 * del disco recién al enviarlo: si en el medio cambió (Word guardando solo,
 * Drive/OneDrive sincronizando), Chrome corta con ERR_UPLOAD_FILE_CHANGED, el
 * pedido nunca llega al servidor y el usuario no ve por qué. Con la copia eso
 * no pasa, y si el archivo no se puede leer, el aviso sale al elegirlo.
 */
export async function readFilesIntoMemory(files: File[]): Promise<File[]> {
  return Promise.all(files.map(async f => {
    try {
      return new File([await f.arrayBuffer()], f.name, { type: f.type, lastModified: f.lastModified });
    } catch {
      throw new Error(`No se pudo leer "${f.name}". Si está abierto en Word, cerralo; si está en Drive u OneDrive, descargalo a la compu. Después elegilo de nuevo.`);
    }
  }));
}

/** Mensaje cuando el envío falla antes de llegar al servidor (red o archivo). */
export const UPLOAD_SEND_ERROR =
  'No se pudo enviar. Revisá la conexión y, si el archivo está abierto en Word, cerralo y volvé a elegirlo.';

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
