/**
 * Desconecta el calendario del alumno: revoca el token en Google, borra los
 * eventos que le habíamos creado y elimina la cuenta guardada.
 *
 * Borrar los eventos es deliberado: si desconecta, no queremos dejarle
 * agendado algo que ya no vamos a poder actualizar ni cancelar.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { deleteEvent, refreshAccessToken, revokeToken } from '@/src/services/googleCalendar';
import { serviceClient } from '@/src/services/calendarSync';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.id) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 });

  const db = serviceClient();
  const { data: acc } = await db
    .from('google_calendar_accounts')
    .select('refresh_token, calendar_id')
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (!acc) return NextResponse.json({ ok: true, alreadyDisconnected: true });

  const { data: links } = await db
    .from('google_calendar_events')
    .select('google_event_id')
    .eq('profile_id', profile.id);

  let removed = 0;
  try {
    const { accessToken } = await refreshAccessToken((acc as any).refresh_token);
    for (const link of (links ?? []) as any[]) {
      try {
        await deleteEvent(accessToken, (acc as any).calendar_id, link.google_event_id);
        removed++;
      } catch { /* el evento ya no está: nada que hacer */ }
    }
  } catch (err) {
    // El token ya estaba revocado desde la cuenta de Google. Seguimos con la
    // limpieza local igual.
    console.error('[gcal] no se pudieron borrar los eventos al desconectar:', err);
  }

  await revokeToken((acc as any).refresh_token);
  await db.from('google_calendar_events').delete().eq('profile_id', profile.id);
  await db.from('google_calendar_accounts').delete().eq('profile_id', profile.id);

  return NextResponse.json({ ok: true, removed });
}
