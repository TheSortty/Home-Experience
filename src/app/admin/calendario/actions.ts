'use server';

/**
 * Acciones que el panel llama después de tocar una jornada, para que el cambio
 * llegue a los Google Calendar de los alumnos.
 *
 * Están separadas del CRUD (que va por supabaseRest desde el cliente) a
 * propósito: sincronizar necesita la service role key, que nunca puede salir
 * al navegador.
 */

import { createClient } from '@/utils/supabase/server';
import { isAdminRole } from '@/src/services/roleService';
import { isGoogleCalendarConfigured } from '@/src/services/googleCalendar';
import { removeSession, syncSession, type SessionSource, type SyncResult } from '@/src/services/calendarSync';

async function assertStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single();
  if (!isAdminRole(profile?.role ?? '')) throw new Error('Sin permisos');
  return profile!;
}

export interface SyncActionResult {
  ok: boolean;
  /** null cuando la integración no está configurada: no es un error. */
  result?: SyncResult;
  error?: string;
}

/**
 * Propaga el alta o la edición de una jornada.
 *
 * Nunca tira: si Google falla, la jornada igual quedó guardada en el campus y
 * no queremos que un error de sincronización parezca un error de guardado.
 */
export async function syncSessionToCalendars(
  source: SessionSource,
  sessionId: string,
): Promise<SyncActionResult> {
  try {
    await assertStaff();
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Sin permisos' };
  }

  if (!isGoogleCalendarConfigured()) return { ok: true };

  try {
    return { ok: true, result: await syncSession(source, sessionId) };
  } catch (err: any) {
    console.error('[gcal] syncSessionToCalendars:', err);
    return { ok: false, error: err?.message ?? 'Error de sincronización' };
  }
}

/** Borra la jornada de los calendarios. Llamar ANTES de borrarla de la base. */
export async function removeSessionFromCalendars(
  source: SessionSource,
  sessionId: string,
): Promise<SyncActionResult> {
  try {
    await assertStaff();
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Sin permisos' };
  }

  if (!isGoogleCalendarConfigured()) return { ok: true };

  try {
    return { ok: true, result: await removeSession(source, sessionId) };
  } catch (err: any) {
    console.error('[gcal] removeSessionFromCalendars:', err);
    return { ok: false, error: err?.message ?? 'Error de sincronización' };
  }
}
