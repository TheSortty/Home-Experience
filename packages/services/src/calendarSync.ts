/**
 * Orquesta la sincronización de jornadas hacia los Google Calendar de los
 * alumnos.
 *
 * Reglas de quién recibe qué:
 *   - course_session → los alumnos con acceso al curso (course_access).
 *   - cycle_session  → los alumnos inscriptos en el ciclo (enrollments
 *                      activas o completadas).
 * En ambos casos, sólo los que además conectaron su calendario.
 *
 * SOLO SERVIDOR: usa la service role key para leer refresh tokens.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  GoogleCalendarError,
  deleteEvent,
  insertEvent,
  patchEvent,
  refreshAccessToken,
  type CalendarEventInput,
} from './googleCalendar';

export type SessionSource = 'course_session' | 'cycle_session';

/** Margen para no usar un access token que vence mientras lo estamos usando. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

export function serviceClient(): SupabaseClient<any, 'public', any> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface AccountRow {
  profile_id: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  calendar_id: string;
}

/**
 * Devuelve un access token utilizable, refrescándolo si hace falta.
 * Guarda el token refrescado para no pedir uno nuevo en cada evento.
 */
async function usableAccessToken(db: SupabaseClient<any, 'public', any>, acc: AccountRow): Promise<string> {
  const expiresAt = acc.access_token_expires_at ? Date.parse(acc.access_token_expires_at) : 0;
  if (acc.access_token && expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now()) {
    return acc.access_token;
  }

  const fresh = await refreshAccessToken(acc.refresh_token);
  await db
    .from('google_calendar_accounts')
    .update({ access_token: fresh.accessToken, access_token_expires_at: fresh.expiresAt })
    .eq('profile_id', acc.profile_id);

  acc.access_token = fresh.accessToken;
  acc.access_token_expires_at = fresh.expiresAt;
  return fresh.accessToken;
}

/** Marca la cuenta como caída para que la UI le pida reconectar. */
async function flagAccountError(
  db: SupabaseClient<any, 'public', any>,
  profileId: string,
  message: string,
) {
  await db
    .from('google_calendar_accounts')
    .update({ last_error: message.slice(0, 500) })
    .eq('profile_id', profileId);
}

// ─── Lectura de la jornada ──────────────────────────────────────────────────

export interface SessionData {
  id: string;
  source: SessionSource;
  event: CalendarEventInput;
  /** Alumnos que deberían tener esta jornada en su calendario. */
  audienceProfileIds: string[];
  /** true si la jornada ya no existe: hay que borrar los eventos. */
  deleted: boolean;
}

export async function loadCourseSession(
  db: SupabaseClient<any, 'public', any>,
  sessionId: string,
): Promise<SessionData | null> {
  const { data } = await db
    .from('course_sessions')
    .select('id, course_id, session_date, session_time, end_time, time_zone, label, description, location_url, is_cancelled, courses(title)')
    .eq('id', sessionId)
    .maybeSingle();

  if (!data) return null;
  const row = data as any;
  const courseTitle = row.courses?.title ?? 'Programa';

  const { data: access } = await db
    .from('course_access')
    .select('profile_id')
    .eq('course_id', row.course_id);

  return {
    id: row.id,
    source: 'course_session',
    deleted: false,
    audienceProfileIds: (access ?? []).map((a: any) => a.profile_id),
    event: {
      summary: row.label ? `${row.label} · ${courseTitle}` : `Jornada · ${courseTitle}`,
      description: row.description ?? undefined,
      location: row.location_url ?? undefined,
      date: row.session_date,
      startTime: row.session_time,
      endTime: row.end_time,
      timeZone: row.time_zone ?? 'America/Argentina/Buenos_Aires',
      cancelled: row.is_cancelled ?? false,
    },
  };
}

export async function loadCycleSession(
  db: SupabaseClient<any, 'public', any>,
  sessionId: string,
): Promise<SessionData | null> {
  const { data } = await db
    .from('cycle_sessions')
    .select('id, cycle_id, session_date, session_time, end_time, time_zone, label, label_detail, location_url, is_cancelled, cycles(name)')
    .eq('id', sessionId)
    .maybeSingle();

  if (!data) return null;
  const row = data as any;
  const cycleName = row.cycles?.name ?? 'Ciclo';

  const { data: enrolled } = await db
    .from('enrollments')
    .select('user_id')
    .eq('cycle_id', row.cycle_id)
    .in('status', ['active', 'completed']);

  return {
    id: row.id,
    source: 'cycle_session',
    deleted: false,
    audienceProfileIds: (enrolled ?? []).map((e: any) => e.user_id).filter(Boolean),
    event: {
      summary: row.label ? `${row.label} · ${cycleName}` : `Encuentro · ${cycleName}`,
      description: row.label_detail ?? undefined,
      location: row.location_url ?? undefined,
      date: row.session_date,
      startTime: row.session_time,
      endTime: row.end_time,
      timeZone: row.time_zone ?? 'America/Argentina/Buenos_Aires',
      cancelled: row.is_cancelled ?? false,
    },
  };
}

export async function loadSession(
  db: SupabaseClient<any, 'public', any>,
  source: SessionSource,
  sessionId: string,
): Promise<SessionData | null> {
  return source === 'course_session'
    ? loadCourseSession(db, sessionId)
    : loadCycleSession(db, sessionId);
}

// ─── Sincronización ─────────────────────────────────────────────────────────

export interface SyncResult {
  created: number;
  updated: number;
  removed: number;
  failed: number;
  skipped: number;
}

const EMPTY: SyncResult = { created: 0, updated: 0, removed: 0, failed: 0, skipped: 0 };

/**
 * Propaga una jornada a los calendarios conectados de su audiencia.
 *
 * Es idempotente: si el evento ya existe lo actualiza (PATCH), y si alguien
 * dejó de pertenecer a la audiencia le borra el evento.
 */
export async function syncSession(
  source: SessionSource,
  sessionId: string,
): Promise<SyncResult> {
  const db = serviceClient();
  const session = await loadSession(db, source, sessionId);

  // La jornada ya no existe → limpiar lo que hayamos creado.
  if (!session) return removeSession(source, sessionId);

  const result: SyncResult = { ...EMPTY };

  const { data: existingLinks } = await db
    .from('google_calendar_events')
    .select('profile_id, google_event_id')
    .eq('source', source)
    .eq('session_id', sessionId);

  const linkByProfile = new Map<string, string>(
    (existingLinks ?? []).map((l: any) => [l.profile_id, l.google_event_id]),
  );

  const audience = new Set(session.audienceProfileIds);
  if (audience.size === 0 && linkByProfile.size === 0) return result;

  // Sólo los de la audiencia que conectaron su calendario.
  const { data: accounts } = await db
    .from('google_calendar_accounts')
    .select('profile_id, refresh_token, access_token, access_token_expires_at, calendar_id')
    .in('profile_id', [...new Set([...audience, ...linkByProfile.keys()])]);

  for (const raw of (accounts ?? []) as AccountRow[]) {
    const acc = { ...raw };
    const existingEventId = linkByProfile.get(acc.profile_id);
    const belongs = audience.has(acc.profile_id);

    try {
      const token = await usableAccessToken(db, acc);

      if (!belongs) {
        // Perdió el acceso al curso o se dio de baja del ciclo.
        if (existingEventId) {
          await deleteEvent(token, acc.calendar_id, existingEventId);
          await db.from('google_calendar_events').delete()
            .eq('source', source).eq('session_id', sessionId).eq('profile_id', acc.profile_id);
          result.removed++;
        }
        continue;
      }

      if (existingEventId) {
        await patchEvent(token, acc.calendar_id, existingEventId, session.event);
        await db.from('google_calendar_events')
          .update({ synced_at: new Date().toISOString() })
          .eq('source', source).eq('session_id', sessionId).eq('profile_id', acc.profile_id);
        result.updated++;
      } else {
        const eventId = await insertEvent(token, acc.calendar_id, session.event);
        await db.from('google_calendar_events').insert({
          profile_id: acc.profile_id,
          source,
          session_id: sessionId,
          google_event_id: eventId,
        });
        result.created++;
      }

      await db.from('google_calendar_accounts')
        .update({ last_sync_at: new Date().toISOString(), last_error: null })
        .eq('profile_id', acc.profile_id);
    } catch (err: any) {
      result.failed++;
      const msg = err?.message ?? String(err);
      await flagAccountError(db, acc.profile_id, msg);
      // El alumno revocó el permiso: no tiene sentido reintentar en este ciclo.
      if (err instanceof GoogleCalendarError && err.needsReconnect) continue;
    }
  }

  // Los de la audiencia sin cuenta conectada no son un error, son "todavía no".
  result.skipped = [...audience].filter(
    (p) => !(accounts ?? []).some((a: any) => a.profile_id === p),
  ).length;

  return result;
}

/** Borra los eventos de una jornada que dejó de existir. */
export async function removeSession(
  source: SessionSource,
  sessionId: string,
): Promise<SyncResult> {
  const db = serviceClient();
  const result: SyncResult = { ...EMPTY };

  const { data: links } = await db
    .from('google_calendar_events')
    .select('profile_id, google_event_id')
    .eq('source', source)
    .eq('session_id', sessionId);

  if (!links || links.length === 0) return result;

  const { data: accounts } = await db
    .from('google_calendar_accounts')
    .select('profile_id, refresh_token, access_token, access_token_expires_at, calendar_id')
    .in('profile_id', links.map((l: any) => l.profile_id));

  const accById = new Map((accounts ?? []).map((a: any) => [a.profile_id, a as AccountRow]));

  for (const link of links as any[]) {
    const acc = accById.get(link.profile_id);
    if (!acc) continue;
    try {
      const token = await usableAccessToken(db, { ...acc });
      await deleteEvent(token, acc.calendar_id, link.google_event_id);
      result.removed++;
    } catch (err: any) {
      result.failed++;
      await flagAccountError(db, link.profile_id, err?.message ?? String(err));
    }
  }

  await db.from('google_calendar_events').delete()
    .eq('source', source).eq('session_id', sessionId);

  return result;
}

/**
 * Carga inicial: todas las jornadas futuras de una persona recién conectada.
 * Sólo mira hacia adelante — llenarle el calendario de encuentros pasados no
 * le sirve a nadie.
 */
export async function syncAllForProfile(profileId: string): Promise<SyncResult> {
  const db = serviceClient();
  const result: SyncResult = { ...EMPTY };
  const today = new Date().toISOString().slice(0, 10);

  const { data: courseIds } = await db
    .from('course_access')
    .select('course_id')
    .eq('profile_id', profileId);

  const { data: cycleIds } = await db
    .from('enrollments')
    .select('cycle_id')
    .eq('user_id', profileId)
    .in('status', ['active', 'completed']);

  const sessions: { source: SessionSource; id: string }[] = [];

  if (courseIds && courseIds.length > 0) {
    const { data: cs } = await db
      .from('course_sessions')
      .select('id')
      .in('course_id', courseIds.map((c: any) => c.course_id))
      .gte('session_date', today);
    (cs ?? []).forEach((s: any) => sessions.push({ source: 'course_session', id: s.id }));
  }

  if (cycleIds && cycleIds.length > 0) {
    const { data: ys } = await db
      .from('cycle_sessions')
      .select('id')
      .in('cycle_id', cycleIds.map((c: any) => c.cycle_id))
      .gte('session_date', today);
    (ys ?? []).forEach((s: any) => sessions.push({ source: 'cycle_session', id: s.id }));
  }

  for (const s of sessions) {
    const one = await syncOneForProfile(db, profileId, s.source, s.id);
    result.created += one.created;
    result.updated += one.updated;
    result.failed += one.failed;
  }

  return result;
}

/** Sincroniza una jornada para una sola persona (usado por la carga inicial). */
async function syncOneForProfile(
  db: SupabaseClient<any, 'public', any>,
  profileId: string,
  source: SessionSource,
  sessionId: string,
): Promise<SyncResult> {
  const result: SyncResult = { ...EMPTY };
  const session = await loadSession(db, source, sessionId);
  if (!session) return result;

  const { data: acc } = await db
    .from('google_calendar_accounts')
    .select('profile_id, refresh_token, access_token, access_token_expires_at, calendar_id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!acc) return result;

  const { data: link } = await db
    .from('google_calendar_events')
    .select('google_event_id')
    .eq('profile_id', profileId)
    .eq('source', source)
    .eq('session_id', sessionId)
    .maybeSingle();

  try {
    const token = await usableAccessToken(db, acc as AccountRow);
    if (link?.google_event_id) {
      await patchEvent(token, (acc as any).calendar_id, link.google_event_id, session.event);
      result.updated++;
    } else {
      const eventId = await insertEvent(token, (acc as any).calendar_id, session.event);
      await db.from('google_calendar_events').insert({
        profile_id: profileId, source, session_id: sessionId, google_event_id: eventId,
      });
      result.created++;
    }
  } catch (err: any) {
    result.failed++;
    await flagAccountError(db, profileId, err?.message ?? String(err));
  }

  return result;
}
