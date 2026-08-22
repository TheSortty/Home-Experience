/**
 * Cliente mínimo de Google Calendar, a mano sobre fetch.
 *
 * Por qué no `googleapis`: el runtime es Cloudflare Workers y esa librería
 * arrastra dependencias de Node (http, stream, crypto) que no corren ahí. Los
 * cuatro endpoints que necesitamos son REST plano.
 *
 * SOLO SERVIDOR: usa el client secret. Nunca importar desde un componente
 * cliente.
 */

const OAUTH_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/**
 * calendar.events alcanza para crear y editar eventos propios. Es scope
 * "sensible" en Google: hasta que la app esté verificada, el alumno ve la
 * pantalla de "app no verificada" y hay tope de 100 usuarios.
 */
export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export class GoogleCalendarError extends Error {
  status: number;
  /** true cuando el alumno revocó el permiso: hay que desconectarlo, no reintentar. */
  needsReconnect: boolean;

  constructor(message: string, status: number, needsReconnect = false) {
    super(message);
    this.name = 'GoogleCalendarError';
    this.status = status;
    this.needsReconnect = needsReconnect;
  }
}

export function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Faltan GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET');
  }
  return { clientId, clientSecret };
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return `${origin}/api/google-calendar/callback`;
}

/**
 * URL de consentimiento.
 *
 * `access_type=offline` + `prompt=consent` son los que hacen que Google mande
 * refresh_token. Sin `prompt=consent`, en la segunda autorización del mismo
 * usuario Google devuelve sólo el access token y nos quedamos sin poder
 * refrescar.
 */
export function buildConsentUrl(origin: string, state: string, loginHint?: string): string {
  const { clientId } = googleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: `${GOOGLE_CALENDAR_SCOPE} https://www.googleapis.com/auth/userinfo.email`,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  if (loginHint) params.set('login_hint', loginHint);
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  email: string | null;
}

async function postForm(url: string, body: URLSearchParams): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    // invalid_grant = el refresh token murió (revocado, o la cuenta cambió).
    const needsReconnect = text.includes('invalid_grant');
    throw new GoogleCalendarError(`OAuth ${res.status}: ${text}`, res.status, needsReconnect);
  }
  return text ? JSON.parse(text) : {};
}

export async function exchangeCodeForTokens(code: string, origin: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = googleOAuthConfig();
  const json = await postForm(OAUTH_TOKEN_URL, new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri(origin),
    grant_type: 'authorization_code',
  }));

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
    email: emailFromIdToken(json.id_token),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const { clientId, clientSecret } = googleOAuthConfig();
  const json = await postForm(OAUTH_TOKEN_URL, new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  }));
  return {
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
  };
}

export async function revokeToken(token: string): Promise<void> {
  // Si ya está revocado Google devuelve 400: no es un error para nosotros.
  await fetch(OAUTH_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }).toString(),
  }).catch(() => undefined);
}

/** Lee el email del id_token sin validar firma: viene directo de Google por TLS. */
function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json.email ?? null;
  } catch {
    return null;
  }
}

// ─── Eventos ────────────────────────────────────────────────────────────────

export interface CalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM o HH:MM:SS. Si falta, el evento es de día completo. */
  startTime?: string | null;
  endTime?: string | null;
  timeZone: string;
  /** Marca el evento como cancelado en vez de borrarlo. */
  cancelled?: boolean;
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function hhmm(t: string): string {
  const parts = t.split(':');
  return `${parts[0].padStart(2, '0')}:${(parts[1] ?? '00').padStart(2, '0')}:00`;
}

/**
 * Arma el cuerpo del evento.
 *
 * Con hora mandamos dateTime SIN offset + timeZone y deja que Google resuelva
 * el huso; así no hay que calcular -03:00 a mano ni preocuparse por cambios de
 * horario de verano. Sin hora, el evento es de día completo (`end.date` es
 * exclusivo en la API, por eso el +1).
 */
export function buildEventBody(input: CalendarEventInput): Record<string, unknown> {
  const timed = Boolean(input.startTime);
  const start = timed
    ? { dateTime: `${input.date}T${hhmm(input.startTime!)}`, timeZone: input.timeZone }
    : { date: input.date };

  const end = timed
    ? {
        dateTime: `${input.date}T${hhmm(input.endTime || defaultEnd(input.startTime!))}`,
        timeZone: input.timeZone,
      }
    : { date: addDays(input.date, 1) };

  return {
    summary: input.cancelled ? `CANCELADA — ${input.summary}` : input.summary,
    description: input.description || undefined,
    location: input.location || undefined,
    start,
    end,
    status: input.cancelled ? 'cancelled' : 'confirmed',
    source: { title: 'Campus Home', url: 'https://experienciahome.com' },
  };
}

/** Sin hora de fin cargada, asumimos 2 horas. */
function defaultEnd(startTime: string): string {
  const [h, m] = startTime.split(':').map(Number);
  const end = (h + 2) % 24;
  return `${String(end).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;
}

async function calendarFetch(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<any> {
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) return {};

  const text = await res.text();
  if (!res.ok) {
    // 401/403 con el token fresco = permiso revocado desde la cuenta de Google.
    const needsReconnect = res.status === 401 || res.status === 403;
    throw new GoogleCalendarError(`Calendar ${res.status}: ${text}`, res.status, needsReconnect);
  }
  return text ? JSON.parse(text) : {};
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  input: CalendarEventInput,
): Promise<string> {
  const json = await calendarFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(buildEventBody(input)),
  });
  return json.id as string;
}

export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  input: CalendarEventInput,
): Promise<void> {
  await calendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PATCH', body: JSON.stringify(buildEventBody(input)) },
  );
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  try {
    await calendarFetch(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' },
    );
  } catch (err) {
    // Ya no está: el alumno lo borró a mano. Es el estado que queríamos.
    if (err instanceof GoogleCalendarError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}
