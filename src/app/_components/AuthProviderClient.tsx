'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider } from '@/src/contexts/AuthContext'
import { supabase } from '@/src/services/supabaseClient'

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
 *   Listen to Supabase's client-side auth events. On SIGNED_IN or
 *   TOKEN_REFRESHED, call router.refresh() which tells Next.js to re-fetch all
 *   Server Components in the current route from the server — this time with the
 *   fresh session cookie, so RLS evaluates correctly.
 *
 * Why not startTransition?
 *   router.refresh() is already non-blocking in App Router. No need to wrap it.
 *
 * Why supabase.auth.onAuthStateChange and not a useEffect on the session?
 *   onAuthStateChange fires SYNCHRONOUSLY when the Supabase JS client detects
 *   a new token (either from the cookie on mount, or from a server rotation).
 *   It's the authoritative signal that a new token is available.
 */
export function AuthProviderClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Invalidate the Next.js Server Component cache so the next render
        // uses the fresh token cookie. This resolves the split-brain where
        // the client badge shows data but the main content area is empty.
        router.refresh()
      }

      if (event === 'SIGNED_OUT') {
        // On logout, refresh to clear any protected Server Component data
        // that might still be cached in the RSC payload.
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return <AuthProvider>{children}</AuthProvider>
}
