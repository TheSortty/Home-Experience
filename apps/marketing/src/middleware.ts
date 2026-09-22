import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveRole } from '@home/services/roleService'
import { CAMPUS_URL, safeNextUrl } from '@home/services/siteUrls'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Dominio del cookie de sesión: en prod es '.siendohome.com' para que lo lea
// tanto este Worker como el de campus (SSO entre subdominios). En local no
// hace falta — localhost comparte cookies entre puertos sin domain explícito.
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined

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
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
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
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, cookieOptions(options, request))
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const matchesPrefix = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + '/')
  const isAdminRoute = matchesPrefix('/admin')
  const isLoginRoute = matchesPrefix('/auth/login')
  const isAuthCallback = matchesPrefix('/auth/callback')
  const isUpdatePasswordRoute = matchesPrefix('/auth/update-password')

  if (isAuthCallback || isUpdatePasswordRoute) {
    return supabaseResponse
  }

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
      // No es admin (ni coach entrando a /admin/lms): no tiene nada que hacer
      // acá — lo mandamos a su campus, que ahora vive en otro dominio.
      const redirectResponse = NextResponse.redirect(`${CAMPUS_URL}/dashboard`)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookieOptions(cookie, request))
      })
      return redirectResponse
    }
  }

  // Si un usuario logueado cae en /auth/login (por ej. desde un bookmark),
  // lo mandamos a donde corresponda. NO redirigimos desde '/': un usuario
  // logueado tiene que poder volver a la landing desde el campus/admin.
  if (user && isLoginRoute) {
    const { data: roleRpc } = await supabase.rpc('get_user_role')
    const isAdminRole = roleRpc === 'admin' || roleRpc === 'sysadmin'

    // Si venía con ?next= (lo pone el campus cuando rebota por falta de
    // sesión), ese es el destino real — perderlo acá deja al alumno en el
    // dashboard en vez de la clase a la que quería entrar.
    const nextParam = request.nextUrl.searchParams.get('next')
    const fallback = isAdminRole ? '/admin/dashboard' : `${CAMPUS_URL}/dashboard`
    const dest = safeNextUrl(nextParam, fallback)

    const redirectResponse = dest.startsWith('/')
      ? NextResponse.redirect(new URL(dest, request.url))
      : NextResponse.redirect(dest)

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
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
