import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const IS_PROD = process.env.NODE_ENV === 'production'

/**
 * Normalize cookie options for the current environment.
 * Supabase sets secure:true by default. On HTTP (localhost) the browser
 * silently drops secure cookies — causing the split-brain between
 * client (old token) and server (no cookie → RLS fails → empty page).
 */
function cookieOptions(original: Record<string, any> = {}) {
  return {
    ...original,
    sameSite: 'lax' as const,
    secure: IS_PROD, // false on localhost HTTP, true on production HTTPS
    path: original.path ?? '/',
  }
}

/**
 * updateSession — The canonical @supabase/ssr session refresh pattern.
 *
 * Critical contract:
 *  1. supabaseResponse MUST be built from NextResponse.next({ request }) so
 *     Next.js can forward original request headers to Server Components.
 *  2. setAll MUST write cookies to BOTH the mutable request (for downstream
 *     middleware/server components in the same cycle) AND the response (so the
 *     browser receives the rotated token).
 *  3. If we need to redirect, we copy ALL cookies from supabaseResponse to
 *     the redirect response — otherwise the rotated token is lost.
 *  4. We NEVER call getSession() here. getUser() does a round-trip to the
 *     Supabase Auth server, validates the JWT signature, and is the only call
 *     that can detect a revoked or expired token reliably.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Step 1: Create a base response that preserves Next.js internals.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // a) Patch the request so Server Components in this render cycle read
        //    the fresh token (not the stale one from the original request).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

        // b) Re-create the response AFTER patching the request so Next.js
        //    picks up the mutated request headers.
        supabaseResponse = NextResponse.next({ request })

        // c) Write the fresh cookies with normalized options (secure=false on localhost).
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, cookieOptions(options))
        )
      },
    },
  })

  // Step 2: Validate the session against the Auth server.
  //   - getUser() ALWAYS does a network call — this is intentional.
  //   - It's the only reliable way to detect expired/revoked sessions.
  //   - Do NOT replace this with getSession() — it reads from the (possibly
  //     stale) cookie and skips the Auth server validation.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isCampusRoute = ['/dashboard', '/cursos', '/comunidad', '/calendario', '/perfil'].some(path => request.nextUrl.pathname.startsWith(path))
  const isLoginRoute = request.nextUrl.pathname.startsWith('/auth/login')

  // Step 3: Guard /admin and campus routes — redirect to login if no valid user.
  if ((isAdminRoute || isCampusRoute) && (error || !user)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    // Clear next param to avoid infinite loop if token is permanently invalid.
    redirectUrl.searchParams.delete('next')

    const redirectResponse = NextResponse.redirect(redirectUrl)

    // CRITICAL: copy all session cookies onto the redirect response.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookieOptions(cookie))
    })

    return redirectResponse
  }

  // Step 4: Guard /admin specifically. A student shouldn't access /admin.
  // Note: We don't fetch 'profiles' here to save DB hits in middleware.
  // The actual role check for /admin should also happen inside /admin layouts or pages, 
  // but if they hit /auth/login while logged in, let's just bounce them to /dashboard
  // and the dashboard/page.tsx or layout can redirect admins to /admin/dashboard.
  if (isLoginRoute && user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard' // Let the app handle role-based routing from here

    const redirectResponse = NextResponse.redirect(redirectUrl)

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookieOptions(cookie))
    })

    return redirectResponse
  }

  // Step 5: Return the response with the (potentially refreshed) session cookies.
  return supabaseResponse
}

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match every path EXCEPT:
     *  - _next/static  → bundled JS/CSS assets
     *  - _next/image   → Next.js image optimizer
     *  - favicon.ico, sitemap.xml, robots.txt
     *  - Static image extensions (svg, png, jpg, jpeg, gif, webp)
     *
     * We explicitly match /admin/* and /auth/* to ensure cookie refresh and
     * route guards run for every navigation within the admin panel.
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
