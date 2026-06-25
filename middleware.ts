import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveRole } from './src/services/roleService'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const IS_PROD = process.env.NODE_ENV === 'production'

/**
 * Normalize cookie options for the current environment.
 * Supabase sets secure:true by default. On HTTP (localhost) the browser
 * silently drops secure cookies — causing the split-brain between
 * client (old token) and server (no cookie → RLS fails → empty page).
 */
function cookieOptions(original: Record<string, any> = {}, request?: NextRequest) {
  const isSecure = process.env.NODE_ENV === 'production' || 
                   request?.url.startsWith('https://') || 
                   request?.headers.get('x-forwarded-proto') === 'https';
  return {
    ...original,
    sameSite: 'lax' as const,
    secure: isSecure,
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
          supabaseResponse.cookies.set(name, value, cookieOptions(options, request))
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

  const pathname = request.nextUrl.pathname
  // Match exact prefix or prefix followed by '/' so /cursos-archivados doesn't match /cursos.
  const matchesPrefix = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + '/')
  const isAdminRoute = matchesPrefix('/admin')
  const isCampusRoute = ['/dashboard', '/cursos', '/comunidad', '/calendario', '/perfil'].some(matchesPrefix)
  const isLoginRoute = matchesPrefix('/auth/login')
  const isAuthCallback = matchesPrefix('/auth/callback')
  const isUpdatePasswordRoute = matchesPrefix('/auth/update-password')

  // Bypass auth routes from redirection logic to ensure login links and password resets work
  if (isAuthCallback || isUpdatePasswordRoute) {
    return supabaseResponse
  }


  // Step 3: Role-based Redirection Logic
  const role = user ? await resolveRole(supabase, user.id) : null
  const isAdmin = role === 'admin' || role === 'sysadmin'
  const isCoach = role === 'coach'
  // Coaches can access /admin/lms (entregas + course overview) but nothing else in /admin.
  const isCoachLmsRoute = matchesPrefix('/admin/lms')

  // Guard /admin routes — only admins (and coaches on /admin/lms) allowed
  if (isAdminRoute) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth/login'
      redirectUrl.searchParams.delete('next')
      const redirectResponse = NextResponse.redirect(redirectUrl)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookieOptions(cookie, request))
      })
      return redirectResponse
    }

    if (!isAdmin && !(isCoach && isCoachLmsRoute)) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      const redirectResponse = NextResponse.redirect(redirectUrl)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookieOptions(cookie, request))
      })
      return redirectResponse
    }
  }

  // Guard campus routes — must be authenticated. Admins/sysadmins can be
  // here in two modes:
  //   - default (no param)        → "organizador" mode: their real identity,
  //                                  badges and all-courses view.
  //   - ?as=student / ?preview=true → "vista alumno" preview mode: the campus
  //                                    rendered as a student would see it.
  // We no longer redirect admins out of the campus — the campus layout reads
  // the view mode from the URL and renders accordingly. See campus layout.
  if (isCampusRoute) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth/login'
      redirectUrl.searchParams.delete('next')
      const redirectResponse = NextResponse.redirect(redirectUrl)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookieOptions(cookie, request))
      })
      return redirectResponse
    }
  }

  // Step 4: Final Response & Global Redirects
  // If a logged-in user lands on /auth/login (e.g. via bookmark), bounce them
  // to their dashboard. We DO NOT redirect from '/' — logged-in users must be
  // able to navigate back to the landing page from campus/admin.
  if (user && isLoginRoute) {
    const { data: role } = await supabase.rpc('get_user_role')
    const isAdminRole = role === 'admin' || role === 'sysadmin'

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = isAdminRole ? '/admin/dashboard' : '/dashboard'

    const redirectResponse = NextResponse.redirect(redirectUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookieOptions(cookie, request))
    })
    return redirectResponse
  }

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
