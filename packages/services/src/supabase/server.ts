import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@home/db-types/database.types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const IS_PROD = process.env.NODE_ENV === 'production'
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined

/**
 * createClient — Server-side Supabase client for:
 *   - Route Handlers (e.g. /auth/callback/route.ts)
 *   - Server Components (read-only; setAll silently no-ops)
 *   - Server Actions
 *
 * Cookie contract:
 *   getAll → reads from the Next.js cookie store (automatically populated by
 *            middleware from the inbound request cookies).
 *   setAll → writes back to the cookie store. This ONLY works in mutable
 *            contexts (Route Handlers, Server Actions). In Server Components
 *            the write is silently suppressed (Next.js limitation).
 *            The middleware handles token rotation for SSR renders.
 *
 * Why NOT singleton / module-level?
 *   Each request gets its own cookie store from `cookies()`. Sharing a single
 *   client across requests would bleed sessions between users.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          // Route Handler / Server Action context → mutation is allowed.
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              sameSite: 'lax',
              secure: IS_PROD, // false on localhost HTTP, true on production HTTPS
              path: options?.path ?? '/',
              ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
            })
          )
        } catch {
          // Server Component context → mutation throws.
          // Token rotation is handled by middleware; no action needed here.
        }
      },
    },
  })
}

/**
 * Usuario de la sesión SIN pegarle a /auth/v1/user.
 *
 * getUser() es un viaje de red a Supabase Auth, y sale desde el Worker: la IP
 * que Supabase ve es siempre la misma para todos los alumnos, así que el cupo
 * de ese endpoint es UNO solo para todo el sitio. Con middleware + layout +
 * página cada navegación gastaba 3 llamadas; con unas decenas de personas
 * conectadas el endpoint devolvía 429, getUser() daba null y las páginas
 * respondían 404 / redirigían al login con la sesión perfectamente sana.
 *
 * El middleware ya validó la sesión con getUser() en ESTE mismo request (y
 * rotó el cookie), así que acá alcanza con leer el JWT del cookie. Lo
 * decodificamos a mano en vez de usar session.user para no disparar el warning
 * de "user de getSession() puede ser inseguro".
 *
 * Es sólo para render de páginas/layouts. NO usar en Server Actions ni Route
 * Handlers que mutan datos: ahí seguir con getUser(). Y aunque el JWT fuera
 * falso, los datos salen por RLS, que sí verifica la firma.
 */
export async function getSessionUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ id: string; email: string | undefined } | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return null
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    if (!claims.sub) return null
    return { id: claims.sub as string, email: claims.email as string | undefined }
  } catch {
    return null
  }
}
