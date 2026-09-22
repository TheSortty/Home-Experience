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

/** Origin del sitio principal (landing + admin). */
export const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000';

/** Origin del campus (alumno). */
export const CAMPUS_URL = process.env.NEXT_PUBLIC_CAMPUS_URL || 'http://localhost:3001';

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
