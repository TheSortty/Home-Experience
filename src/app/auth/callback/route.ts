import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
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
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/admin/dashboard'

  const supabase = await createClient()

  // Flujo PKCE directo desde emails (Invitaciones, Reset Password)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // Remover param next para evitar bucles si alguien copia la url
      const redirectUrl = new URL(next, origin)
      return NextResponse.redirect(redirectUrl)
    }
  } 
  // Flujo tradicional (OAuth, Magic Links antiguos)
  else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectUrl = new URL(next, origin)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Si falló o no hay código, redirigir al login
  const loginUrl = new URL('/auth/login', origin)
  loginUrl.searchParams.set('error', 'auth_callback_error')
  return NextResponse.redirect(loginUrl)
}
