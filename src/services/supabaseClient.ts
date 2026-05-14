import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente Supabase para el navegador.
 *
 * CONFIGURACIÓN CRÍTICA:
 * 1. lock: no-op function -> Evita deadlocks de Navigator Locks cuando el refresh falla.
 *    IMPORTANTE: lock espera una función (LockFunc), NO un string.
 * 2. autoRefreshToken: false -> El middleware se encarga de refrescar el token
 *    en cada navegación. Deshabilitarlo aquí evita conflictos de "dual refresh"
 *    que causan la revocación de la sesión.
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
      // No-op lock: ejecuta fn() inmediatamente sin adquirir ningún lock.
      // Esto evita el deadlock de Navigator Locks cuando la sesión se revoca.
      lock: (_name: string, _acquireTimeout: number, fn: <T>() => Promise<T>) => fn(),
    },
  }
)
