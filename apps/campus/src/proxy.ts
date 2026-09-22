import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { MARKETING_URL } from '@home/services/siteUrls'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Mismo dominio de cookie que marketing/middleware.ts — así la sesión que
// arranca en el sitio principal se lee acá sin loguear de nuevo (SSO).
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
 * updateSession — mismo patrón canónico de @supabase/ssr que en marketing.
 * Ver el comentario largo en apps/marketing/src/proxy.ts — el contrato es
 * idéntico, sólo cambia qué rutas protege.
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

  // Todo lo que sirve este Worker es campus: sin sesión no hay nada que ver.
  if (!user) {
    const nextUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`
    const loginUrl = new URL('/auth/login', MARKETING_URL)
    loginUrl.searchParams.set('next', `${request.nextUrl.origin}${nextUrl}`)
    const redirectResponse = NextResponse.redirect(loginUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookieOptions(cookie, request))
    })
    return redirectResponse
  }

  return supabaseResponse
}

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
