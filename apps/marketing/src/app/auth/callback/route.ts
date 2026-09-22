import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@home/services/supabase/server'
import { CAMPUS_URL, safeNextUrl } from '@home/services/siteUrls'
import { type EmailOtpType } from '@supabase/supabase-js'

/**
 * OAuth / Magic Link callback handler.
 *
 * Supabase redirects here after a successful OAuth flow (e.g. Google) with a
 * one-time `code` query parameter. This route exchanges that code for a
 * session cookie so the user is authenticated on the server from this point on.
 *
 * Expected query params:
 *   ?code=<supabase_auth_code>
 *   &next=<optional_redirect_path>   (e.g. "/admin/dashboard")
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as any
  // Sin `next` explícito (link de un alumno, no de un admin) el destino real
  // es el campus, que ahora vive en otro dominio — por eso el default es una
  // URL absoluta y no un path relativo a este origin.
  // safeNextUrl() filtra el parámetro contra los dos orígenes nuestros: acá
  // se redirige JUSTO después de setear la cookie de sesión, así que un next
  // sin validar mandaría al usuario recién logueado a donde quiera el que
  // armó el link.
  const next = safeNextUrl(searchParams.get('next'), `${CAMPUS_URL}/dashboard`)
  const redirectTo = next.startsWith('http') ? next : `${origin}${next}`

  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  // Fallback en caso de error (token expirado)
  return NextResponse.redirect(`${origin}/auth/login?error=InvalidToken`)
}

