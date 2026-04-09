import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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
  const next = searchParams.get('next') ?? '/admin/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect to the intended destination (or dashboard by default)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If the code is missing or exchange failed, send to login with an error flag
  const loginUrl = new URL('/auth/login', origin)
  loginUrl.searchParams.set('error', 'auth_callback_error')
  return NextResponse.redirect(loginUrl)
}
