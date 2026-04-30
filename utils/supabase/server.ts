import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const IS_PROD = process.env.NODE_ENV === 'production'

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

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
