import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@home/db-types/database.types'

/**
 * Cliente Supabase para el navegador.
 *
 * - autoRefreshToken: false -> El middleware rota el token en cada navegación.
 *   Deshabilitarlo aquí evita conflictos de "dual refresh".
 *
 * NOTA: El cliente JS de Supabase tiene un bug en runtime en el panel admin
 * (auth.getSession() se cuelga después de unos segundos de actividad concurrente).
 * Para mutaciones y selects críticos, usar src/services/supabaseRest.ts que
 * bypasea el cliente JS con fetch directo a PostgREST.
 *
 * Este cliente sigue siendo necesario para:
 *   - Auth (login/logout, onAuthStateChange)
 *   - Realtime channels (supabase.channel)
 */
// SSO entre subdominios: el cookie de sesión tiene que escribirse con
// domain=.siendohome.com para que lo lean siendohome.com Y campus.siendohome.com.
// Se deriva del hostname (no de una env var) porque NEXT_PUBLIC_* se inlinea en
// build y no queremos depender de que esté cargada en el CI. En localhost /
// workers.dev queda sin domain (host-only), como antes.
const SHARED_COOKIE_DOMAIN =
  typeof window !== 'undefined' &&
  /(^|\.)siendohome\.com$/.test(window.location.hostname)
    ? '.siendohome.com'
    : undefined

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    ...(SHARED_COOKIE_DOMAIN
      ? {
          cookieOptions: {
            domain: SHARED_COOKIE_DOMAIN,
            path: '/',
            sameSite: 'lax' as const,
            secure: true,
          },
        }
      : {}),
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      detectSessionInUrl: true,
      persistSession: true,
    },
  }
)
