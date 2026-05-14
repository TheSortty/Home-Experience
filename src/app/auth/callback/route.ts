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
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as any
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Fallback en caso de error (token expirado)
  return NextResponse.redirect(`${origin}/auth/login?error=InvalidToken`)
}

