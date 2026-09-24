/**
 * Arranca el consentimiento de Google Calendar para el alumno logueado.
 *
 * El `state` es un valor aleatorio que guardamos en una cookie httpOnly y
 * verificamos en el callback: sin eso, cualquiera podría inducir a un usuario
 * a completar un flujo OAuth de otra cuenta (CSRF).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@home/services/supabase/server';
import { MARKETING_URL } from '@home/services/siteUrls';
import { buildConsentUrl, isGoogleCalendarConfigured } from '@home/services/googleCalendar';

export const OAUTH_STATE_COOKIE = 'gcal_oauth_state';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(`${origin}/calendario?gcal=not_configured`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${MARKETING_URL}/auth/login`);
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildConsentUrl(origin, state, user.email ?? undefined));

  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutos: lo que puede tardar el consentimiento
  });

  return response;
}
