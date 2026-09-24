'use client'

import React, { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthProvider } from '@/src/contexts/AuthContext'
import { supabase } from '@home/services/supabaseClient'

// Mínimo entre dos router.refresh() seguidos. Es el fusible del bucle de abajo.
const MIN_REFRESH_GAP_MS = 10_000

/**
 * Borra las copias "host-only" (sin Domain) de los cookies de sesión.
 *
 * El cliente de Supabase escribe y borra el cookie con domain=.siendohome.com,
 * así que una copia host-only vieja le es invisible al borrarla: queda viva, el
 * cliente la vuelve a leer, intenta refrescarla y falla otra vez.
 */
function purgeHostOnlyAuthCookies() {
  if (typeof document === 'undefined') return
  document.cookie.split(';').forEach((raw) => {
    const name = raw.split('=')[0].trim()
    if (!name.startsWith('sb-')) return
    document.cookie = `${name}=; Path=/; Max-Age=0; Secure; SameSite=Lax`
  })
}

/**
 * AuthProviderClient — Client boundary wrapper with Server sync.
 *
 * Problem being solved:
 *   The middleware rotates the Supabase session token and writes the fresh
 *   cookie onto the HTTP response. However, Next.js App Router caches Server
 *   Component output. If we don't explicitly invalidate that cache after a
 *   token rotation, the next Server Component render still uses the stale RSC
 *   payload (old token → RLS auth fails → empty data).
 *
 * Solution:
 *   Listen to Supabase's client-side auth events. On a real SIGNED_IN /
 *   TOKEN_REFRESHED / SIGNED_OUT, call router.refresh() so Next.js re-fetches
 *   the Server Components with the fresh cookie.
 *
 * Bucle que hay que evitar (así se cayó producción con 429s):
 *   auth-js trata un 429 en el refresh como error definitivo → borra la sesión
 *   y emite SIGNED_OUT. Si por cada SIGNED_OUT hacemos router.refresh(), la
 *   página se re-renderiza, alguien vuelve a pedir la sesión, se intenta otro
 *   refresh, otro 429, otro SIGNED_OUT... a razón de decenas por segundo, que
 *   es justo lo que mantiene bloqueada la IP. Por eso:
 *     · SIGNED_OUT sólo refresca si de verdad HABÍA una sesión (un logout real);
 *     · SIGNED_IN sólo refresca al pasar de "sin sesión" a "con sesión"
 *       (auth-js lo re-emite al volver el foco a la pestaña);
 *     · nunca más de un refresh cada MIN_REFRESH_GAP_MS;
 *     · en /auth/* no se refresca: esas pantallas navegan por su cuenta.
 */
export function AuthProviderClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  // Refs para que la suscripción se cree UNA sola vez: con router/pathname en
  // las deps, cada refresh re-suscribía y volvía a disparar INITIAL_SESSION.
  const routerRef = useRef(router)
  const pathnameRef = useRef(pathname)
  routerRef.current = router
  pathnameRef.current = pathname

  const hadSessionRef = useRef<boolean | null>(null)
  const lastRefreshRef = useRef(0)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const hasSession = !!session?.user
      const hadSession = hadSessionRef.current
      hadSessionRef.current = hasSession

      if (event === 'SIGNED_OUT') purgeHostOnlyAuthCookies()

      let shouldRefresh = false
      if (event === 'SIGNED_IN') shouldRefresh = hadSession !== true
      else if (event === 'TOKEN_REFRESHED') shouldRefresh = true
      else if (event === 'SIGNED_OUT') shouldRefresh = hadSession === true

      if (!shouldRefresh) return
      if (pathnameRef.current?.startsWith('/auth/')) return

      const now = Date.now()
      if (now - lastRefreshRef.current < MIN_REFRESH_GAP_MS) return
      lastRefreshRef.current = now

      // Invalidate the Next.js Server Component cache so the next render uses
      // the fresh token cookie (or no protected data after a logout).
      routerRef.current.refresh()
    })

    return () => subscription.unsubscribe()
  }, [])

  return <AuthProvider>{children}</AuthProvider>
}
