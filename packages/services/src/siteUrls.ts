// URLs de los dos Workers que forman el sitio, para armar links/redirects
// entre ellos (dominios distintos desde que se separó el campus).
//
// De dónde salen estos valores en cada caso:
//   - Deploy (Workers Builds o `npm run deploy`): el build de OpenNext lee los
//     `vars` de wrangler.jsonc y los inyecta al build de Next, PISANDO lo que
//     venga de .env* o del shell. Ver getEnvFromPlatformProxy() en
//     @opennextjs/cloudflare. O sea que en producción manda wrangler.jsonc.
//   - `next dev` / `next build` a secas: esos no pasan por OpenNext y no ven
//     el wrangler.jsonc, así que sale del .env.local de cada app. Sin él,
//     caen a los puertos de dev de acá abajo.
//
// Ojo con una cosa igual: las NEXT_PUBLIC_* se inlinean en el bundle al
// compilar, no se leen del entorno del Worker. Un `next build` a mano
// (sin .env.local y sin OpenNext) hornea el fallback de localhost en el
// bundle del navegador. Para chequear un build antes de subirlo:
//   grep -rl "localhost:300" apps/<app>/.next/static/chunks   → tiene que dar vacío

// Si el build no inlineó NEXT_PUBLIC_*_URL (pasó: el bundle del navegador salió
// con `process.env.X || "http://localhost:3000"` sin resolver y "Volver al
// admin" mandaba a localhost), el navegador se resuelve solo: en *.siendohome.com
// los orígenes son fijos. En el servidor process.env sí existe en runtime.
function fallbackOrigin(app: 'marketing' | 'campus'): string {
  if (typeof window !== 'undefined' && /(^|\.)siendohome\.com$/.test(window.location.hostname)) {
    return app === 'marketing' ? 'https://siendohome.com' : 'https://campus.siendohome.com';
  }
  return app === 'marketing' ? 'http://localhost:3000' : 'http://localhost:3001';
}

/** Origin del sitio principal (landing + admin). */
export const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || fallbackOrigin('marketing');

/** Origin del campus (alumno). */
export const CAMPUS_URL = process.env.NEXT_PUBLIC_CAMPUS_URL || fallbackOrigin('campus');

/**
 * Valida un `?next=` antes de redirigir.
 *
 * El parámetro viene de la URL, así que es input del usuario: sin filtrar, un
 * link tipo /auth/login?next=https://sitio-falso.com manda al alumno a
 * cualquier lado JUSTO después de que se le setea la cookie de sesión. Sólo
 * dejamos pasar paths relativos y URLs absolutas de nuestros dos orígenes.
 */
export function safeNextUrl(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;

  // Nunca volver al login: sería un loop, y en el campus (que no tiene /auth/*)
  // un 404. Pasó: el logout del campus mandaba a /auth/login del propio campus
  // y el middleware lo guardaba como ?next=. (/auth/update-password sí es un
  // destino válido: es a donde apunta el mail de recuperar contraseña.)
  if (/^(https?:\/\/[^/]+)?\/auth\/login(\/|$|\?)/.test(next)) return fallback;

  // Path relativo ("/cursos/abc"). Rechazamos "//host" y "/\host", que el
  // navegador interpreta como protocol-relative y salen del sitio.
  if (next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
    return next;
  }

  try {
    const url = new URL(next);
    const allowed = [MARKETING_URL, CAMPUS_URL].map((u) => new URL(u).origin);
    if (allowed.includes(url.origin)) return url.toString();
  } catch {
    // next no era una URL válida — cae al fallback.
  }

  return fallback;
}
