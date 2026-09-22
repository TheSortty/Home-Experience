// URLs de los dos Workers que forman el sitio, para armar links/redirects
// entre ellos (dominios distintos desde que se separó el campus).
//
// Las tres variables (NEXT_PUBLIC_*) se cargan en cada Worker vía
// wrangler.jsonc → vars. En local, si no están seteadas, caen a los puertos
// de dev por convención (marketing: 3000, campus: 3001).

/** Origin del sitio principal (landing + admin). */
export const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000';

/** Origin del campus (alumno). */
export const CAMPUS_URL = process.env.NEXT_PUBLIC_CAMPUS_URL || 'http://localhost:3001';
