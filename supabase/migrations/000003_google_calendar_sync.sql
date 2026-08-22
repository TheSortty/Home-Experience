-- ─────────────────────────────────────────────────────────────────────────────
-- 000003 — Sincronización de jornadas con Google Calendar
--
-- 1. Las jornadas ganan hora de fin, zona horaria y estado de cancelación.
--    Sin hora de fin no se puede generar un evento de calendario decente, y
--    cycle_sessions directamente no tenía hora.
--
-- 2. google_calendar_accounts: el refresh token de cada alumno que conectó su
--    cuenta. Es material sensible: la tabla NO es legible desde el cliente
--    (RLS sin políticas + REVOKE explícito). Sólo la service role la toca.
--    El alumno consulta su estado de conexión por my_google_calendar_status().
--
-- 3. google_calendar_events: qué evento de Google corresponde a qué jornada
--    para qué persona, para poder editar y borrar después de haber creado.
--
-- Idempotente: seguro de ejecutar más de una vez.
-- ─────────────────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------------------
-- 1. Las jornadas necesitan horario completo
-- ---------------------------------------------------------------------------

ALTER TABLE public.course_sessions
    ADD COLUMN IF NOT EXISTS end_time     TIME,
    ADD COLUMN IF NOT EXISTS time_zone    TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now());

ALTER TABLE public.cycle_sessions
    ADD COLUMN IF NOT EXISTS session_time TIME,
    ADD COLUMN IF NOT EXISTS end_time     TIME,
    ADD COLUMN IF NOT EXISTS label_detail TEXT,
    ADD COLUMN IF NOT EXISTS location_url TEXT,
    ADD COLUMN IF NOT EXISTS time_zone    TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now());

-- updated_at se usa para saber si hay que re-sincronizar.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := timezone('utc', now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_sessions_touch_updated_at ON public.course_sessions;
CREATE TRIGGER course_sessions_touch_updated_at
    BEFORE UPDATE ON public.course_sessions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS cycle_sessions_touch_updated_at ON public.cycle_sessions;
CREATE TRIGGER cycle_sessions_touch_updated_at
    BEFORE UPDATE ON public.cycle_sessions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Cuentas de Google conectadas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.google_calendar_accounts (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id              UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    google_email            TEXT,
    refresh_token           TEXT NOT NULL,
    access_token            TEXT,
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    calendar_id             TEXT NOT NULL DEFAULT 'primary',
    connected_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    last_sync_at            TIMESTAMP WITH TIME ZONE,
    last_error              TEXT
);

-- Tokens: nadie los lee desde el navegador. RLS sin políticas deniega todo, y
-- el REVOKE anula el GRANT por defecto que el init le da a authenticated.
ALTER TABLE public.google_calendar_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_calendar_accounts FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Qué evento de Google es cada jornada, para cada persona
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.google_calendar_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source          TEXT NOT NULL CHECK (source IN ('course_session', 'cycle_session')),
    session_id      UUID NOT NULL,
    google_event_id TEXT NOT NULL,
    synced_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (profile_id, source, session_id)
);

CREATE INDEX IF NOT EXISTS google_calendar_events_session_idx
    ON public.google_calendar_events(source, session_id);

ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_calendar_events FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Estado de conexión visible para el propio alumno
-- ---------------------------------------------------------------------------

-- Devuelve si la persona conectó su calendario, sin exponer los tokens.
CREATE OR REPLACE FUNCTION public.my_google_calendar_status()
RETURNS TABLE (
    connected     BOOLEAN,
    google_email  TEXT,
    connected_at  TIMESTAMP WITH TIME ZONE,
    last_sync_at  TIMESTAMP WITH TIME ZONE,
    last_error    TEXT,
    synced_events BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_profile UUID := public.get_my_profile_id();
BEGIN
    RETURN QUERY
        SELECT TRUE,
               a.google_email,
               a.connected_at,
               a.last_sync_at,
               a.last_error,
               (SELECT count(*) FROM public.google_calendar_events e
                 WHERE e.profile_id = v_profile)
          FROM public.google_calendar_accounts a
         WHERE a.profile_id = v_profile;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TEXT, 0::BIGINT;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.my_google_calendar_status() TO authenticated;
