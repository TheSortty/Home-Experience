// URLs de los dos Workers que forman el sitio, para armar links/redirects
// entre ellos (dominios distintos desde que se separó el campus).
//
// OJO con NEXT_PUBLIC_*: Next las inlinea en el bundle EN TIEMPO DE BUILD, no
// las lee del entorno del Worker. O sea que los `vars` de wrangler.jsonc sólo
// alcanzan para el código de servidor; lo que corre en el navegador se queda
// con el valor que hubiera cuando se compiló. Como `npm run deploy` compila en
// la máquina del dev, un build sin estas variables se llevaba puesto el
// fallback de localhost a producción — y el alumno terminaba redirigido a
// http://localhost:3001/dashboard después de loguearse.
//
// Por eso hay dos redes de contención:
//   1. Los scripts `deploy`/`preview`/`upload` de cada app setean las dos
//      variables explícitamente antes de compilar (ahí sí se inlinean bien).
//   2. resolve() de abajo: si igual faltaran, en el navegador se fija en qué
//      host está parado antes de asumir que es local.

const PROD_MARKETING = 'https://siendohome.com';
const PROD_CAMPUS = 'https://campus.siendohome.com';

function resolve(envValue: string | undefined, prodUrl: string, devPort: number): string {
  if (envValue) return envValue;

  // Sin variable: el host desde el que se sirve la página es la única fuente
  // confiable que tenemos acá. Si no es localhost, esto es producción.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') return prodUrl;
  }

  return `http://localhost:${devPort}`;
}

/** Origin del sitio principal (landing + admin). */
export const MARKETING_URL = resolve(process.env.NEXT_PUBLIC_MARKETING_URL, PROD_MARKETING, 3000);

/** Origin del campus (alumno). */
export const CAMPUS_URL = resolve(process.env.NEXT_PUBLIC_CAMPUS_URL, PROD_CAMPUS, 3001);

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
