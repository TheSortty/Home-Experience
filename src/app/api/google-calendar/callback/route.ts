/**
 * Cierra el flujo de OAuth: cambia el code por tokens, los guarda y hace la
 * carga inicial de las jornadas futuras.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { exchangeCodeForTokens } from '@/src/services/googleCalendar';
import { serviceClient, syncAllForProfile } from '@/src/services/calendarSync';
import { OAUTH_STATE_COOKIE } from '../connect/route';

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const back = (status: string) => NextResponse.redirect(`${origin}/calendario?gcal=${status}`);

  // El alumno apretó "Cancelar" en la pantalla de Google.
  if (searchParams.get('error')) return back('cancelled');

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const expectedState = request.headers.get('cookie')?.match(
    new RegExp(`${OAUTH_STATE_COOKIE}=([^;]+)`),
  )?.[1];

  if (!code || !state || !expectedState || state !== expectedState) {
    return back('invalid_state');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/auth/login`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.id) return back('no_profile');

  try {
    const tokens = await exchangeCodeForTokens(code, origin);

    // Sin refresh token no podemos sincronizar más allá de la primera hora.
    // Pasa si el usuario ya había autorizado y Google no lo reenvía; el
    // prompt=consent de buildConsentUrl está justamente para evitarlo.
    if (!tokens.refreshToken) return back('no_refresh_token');

    const db = serviceClient();
    await db.from('google_calendar_accounts').upsert({
      profile_id: profile.id,
      google_email: tokens.email,
      refresh_token: tokens.refreshToken,
      access_token: tokens.accessToken,
      access_token_expires_at: tokens.expiresAt,
      calendar_id: 'primary',
      connected_at: new Date().toISOString(),
      last_error: null,
    }, { onConflict: 'profile_id' });

    // Carga inicial. Si falla, la conexión igual quedó hecha: lo importante es
    // no perder el refresh token que acabamos de recibir.
    let synced = 0;
    try {
      const result = await syncAllForProfile(profile.id);
      synced = result.created + result.updated;
    } catch (err) {
      console.error('[gcal] carga inicial falló:', err);
    }

    const response = back(`connected&eventos=${synced}`);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch (err) {
    console.error('[gcal] callback falló:', err);
    return back('error');
  }
}
