import { createBrowserClient } from '@supabase/ssr'

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
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      detectSessionInUrl: true,
      persistSession: true,
    },
  }
)
