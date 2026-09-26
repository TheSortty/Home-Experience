/**
 * Errores de carga de chunks JS (ChunkLoadError).
 *
 * Pasan cuando el HTML que tiene el usuario apunta a un chunk de otro build
 * (deploy reciente, pestaña vieja abierta, cache): el chunk da 404 y el
 * `reset()` de un error boundary NO sirve, porque webpack cachea la promesa
 * rechazada. La única salida es recargar la página para bajar el HTML nuevo.
 */

const RELOAD_KEY = 'chunk-error-reload-at';
// Evita el bucle de recargas si el chunk sigue roto: como mucho 1 cada 30 s.
const RELOAD_COOLDOWN_MS = 30_000;

const CHUNK_ERROR_RE =
  /ChunkLoadError|Loading chunk .+ failed|Failed to load chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, message } = error as { name?: string; message?: string };
  return CHUNK_ERROR_RE.test(`${name ?? ''} ${message ?? ''}`);
}

/**
 * Si `error` es de chunk, recarga la página (una vez por ventana de cooldown).
 * Devuelve true si disparó la recarga.
 */
export function reloadOnChunkError(error: unknown): boolean {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage bloqueado: no podemos proteger contra el bucle → no recargamos solos.
    return false;
  }
  window.location.reload();
  return true;
}

/** Acción del botón "Reintentar": reload real para chunks, reset() para el resto. */
export function retryAfterError(error: unknown, reset: () => void): void {
  if (isChunkLoadError(error)) window.location.reload();
  else reset();
}
