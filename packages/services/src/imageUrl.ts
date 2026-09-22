/**
 * Normaliza URLs de imagen para que se puedan mostrar embebidas.
 *
 * Convierte links de Google Drive de tipo "share" a thumbnails directos:
 *   https://drive.google.com/file/d/{ID}/view?usp=sharing
 *   ↓
 *   https://drive.google.com/thumbnail?id={ID}&sz=w800
 *
 * El endpoint thumbnail es público, no requiere auth, y devuelve la imagen
 * en JPEG. Tamaños comunes: w400, w800, w1200, w1600.
 *
 * También acepta el formato /open?id=, /uc?id=, etc. y los normaliza.
 */
export function normalizeImageUrl(url: string | null | undefined, size: 'w400' | 'w800' | 'w1200' | 'w1600' = 'w800'): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Google Drive — extrae el ID de cualquier formato común
  if (trimmed.includes('drive.google.com')) {
    // /file/d/{ID}/view o /file/d/{ID}/preview
    let match = trimmed.match(/\/file\/d\/([^/]+)/)
    // /open?id={ID} o /uc?id={ID}
    if (!match) match = trimmed.match(/[?&]id=([^&]+)/)
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=${size}`
    }
  }

  // URL ya directa (https://..., data:, blob:, /uploads/...)
  return trimmed
}
