-- =============================================================================
-- HOME Experience / CRESER — Esquema unificado (estado final)
-- Squash de las migraciones 000000 → 000014.
--
-- Es el esquema canónico: crea cada tabla con TODAS sus columnas finales, todas
-- las funciones/RPCs, RLS, storage, realtime, permisos, índices y seed.
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS /
-- ON CONFLICT. Seguro de re-aplicar sobre una base ya provisionada.
--
-- Convenciones:
--   • UUID por defecto: uuid_generate_v4() (extensión uuid-ossp).
--   • Timestamps: TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()).
--   • RLS: un loop habilita RLS + política staff_all_access (is_staff) en TODAS
--     las tablas; las políticas por-tabla de abajo añaden acceso de alumno/coach.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------------

-- ── 1.1 Identidad / CRM ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID UNIQUE,
    email                TEXT UNIQUE,
    first_name           TEXT,
    last_name            TEXT,
    phone                TEXT,
    avatar_url           TEXT,
    role                 TEXT DEFAULT 'student',
    bio                  TEXT,
    instagram            TEXT,
    profile_completed_at TIMESTAMP WITH TIME ZONE,         -- NULL → mostrar modal de onboarding
    is_deleted           BOOLEAN NOT NULL DEFAULT false,
    deleted_at           TIMESTAMP WITH TIME ZONE,
    deleted_by           UUID,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- profiles.role: incluye 'coach' (rol intermedio, NO staff). Se reconcilia más
-- abajo (sección 1.x) porque producción tiene CHECKs manuales fuera del repo.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Reconciliar el CHECK de role (producción puede tener CHECKs manuales viejos).
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE t.relname = 'profiles'
          AND n.nspname = 'public'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%role%'
    LOOP
        EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', constraint_record.conname);
    END LOOP;
    ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_role_check
        CHECK (role IN ('student', 'coach', 'admin', 'sysadmin', 'super_admin'));
END $$;

CREATE TABLE IF NOT EXISTS public.packages (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE,
    description   TEXT,
    price         NUMERIC,
    duration_days INTEGER,
    stage_order   INTEGER NOT NULL DEFAULT 1,
    is_active     BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.medical_info (
    user_id                  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    under_treatment          BOOLEAN,
    treatment_details        TEXT,
    medication               TEXT,
    allergies                TEXT,
    emergency_contact_name   TEXT,
    emergency_contact_phone  TEXT,
    updated_at               TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    type       TEXT DEFAULT 'system',
    is_read    BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.goals (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    category    TEXT,
    target_date DATE,
    status      TEXT DEFAULT 'in_progress',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ── 1.2 Cursos / LMS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.courses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    description     TEXT,
    cover_image_url TEXT,
    is_published    BOOLEAN DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.modules (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id    UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    order_index  INTEGER NOT NULL,
    is_published BOOLEAN DEFAULT true,
    -- 'module' (normal) | 'workshop' (taller) | 'institutional' (archivos institucionales)
    module_type  TEXT NOT NULL DEFAULT 'module'
        CHECK (module_type IN ('module', 'workshop', 'institutional')),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id             UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title                 TEXT NOT NULL,
    description           TEXT,
    video_url             TEXT,                  -- legacy single-video (ver lesson_videos)
    duration_seconds      INTEGER DEFAULT 0,     -- legacy: suma de duraciones de lesson_videos
    order_index           INTEGER NOT NULL,
    is_published          BOOLEAN DEFAULT false,
    -- Ciclo de vida + entregas
    status                TEXT NOT NULL DEFAULT 'unlocked'
        CHECK (status IN ('draft', 'scheduled', 'unlocked')),
    unlock_at             TIMESTAMP WITH TIME ZONE,
    unlocked_at           TIMESTAMP WITH TIME ZONE,
    due_days_after_unlock INTEGER,
    requires_submission   BOOLEAN NOT NULL DEFAULT false,
    -- Deadline duro: bloquear entregas pasada la fecha (vs. aceptarlas como "tardías")
    block_after_due       BOOLEAN NOT NULL DEFAULT false,
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Múltiples videos por lección (fuente de verdad del viewer).
CREATE TABLE IF NOT EXISTS public.lesson_videos (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id        UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title            TEXT,
    video_url        TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    order_index      INTEGER NOT NULL DEFAULT 1,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lesson_resources (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id  UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    file_url   TEXT NOT NULL,
    type       TEXT DEFAULT 'link',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id            UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed            BOOLEAN DEFAULT false,
    completed_at         TIMESTAMP WITH TIME ZONE,
    last_watched_seconds INTEGER DEFAULT 0,
    entered_at           TIMESTAMP WITH TIME ZONE,   -- primera entrada a la lección
    video_played_at      TIMESTAMP WITH TIME ZONE,   -- primer play del video
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (user_id, lesson_id)
);

-- Primera vez que un alumno abre cada material.
CREATE TABLE IF NOT EXISTS public.resource_opens (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_resource_id UUID NOT NULL REFERENCES public.lesson_resources(id) ON DELETE CASCADE,
    opened_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (user_id, lesson_resource_id)
);

CREATE TABLE IF NOT EXISTS public.forum_posts (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id  UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id  UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    title      TEXT,
    body       TEXT NOT NULL,
    parent_id  UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Encuentros ligados directamente a un curso (independientes de los ciclos).
CREATE TABLE IF NOT EXISTS public.course_sessions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id    UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_time TIME,
    label        TEXT,
    description  TEXT,
    location_url TEXT,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    created_by   UUID
);

-- ── 1.3 Ciclos / inscripciones / asistencia ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cycles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          TEXT DEFAULT 'active',
    type            TEXT NOT NULL,
    capacity        INTEGER DEFAULT 30,
    enrolled_count  INTEGER DEFAULT 0,
    course_id       UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    is_linear       BOOLEAN NOT NULL DEFAULT false,
    is_deleted      BOOLEAN NOT NULL DEFAULT false,
    deleted_at      TIMESTAMP WITH TIME ZONE,
    deleted_by      UUID,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cycle_sessions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id     UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    label        TEXT,
    is_mandatory BOOLEAN DEFAULT true,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (cycle_id, session_date)
);

CREATE TABLE IF NOT EXISTS public.enrollments (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id              UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
    package_id            INTEGER REFERENCES public.packages(id) ON DELETE SET NULL,
    status                TEXT DEFAULT 'pending',
    payment_status        TEXT DEFAULT 'unpaid',
    pl_number             INTEGER,
    notes                 TEXT,
    conflicted_at         TIMESTAMP WITH TIME ZONE,
    conflicted_session_id UUID,
    enrolled_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    completed_at          TIMESTAMP WITH TIME ZONE
);

-- FK diferida: enrollment.conflicted_session_id → cycle_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'enrollments_conflicted_session_id_fkey'
          AND table_name = 'enrollments'
    ) THEN
        ALTER TABLE public.enrollments
            ADD CONSTRAINT enrollments_conflicted_session_id_fkey
            FOREIGN KEY (conflicted_session_id) REFERENCES public.cycle_sessions(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.enrollment_notes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    content       TEXT NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id                BIGSERIAL PRIMARY KEY,
    enrollment_id     UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    cycle_session_id  UUID REFERENCES public.cycle_sessions(id) ON DELETE SET NULL,
    date              DATE,
    status            TEXT DEFAULT 'present',
    notes             TEXT,
    recorded_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT attendance_date_or_session_check CHECK (date IS NOT NULL OR cycle_session_id IS NOT NULL)
);

-- UNIQUE necesario para el upsert con onConflict 'enrollment_id, cycle_session_id'.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'attendance_enrollment_session_unique'
    ) THEN
        CREATE UNIQUE INDEX attendance_enrollment_session_unique
            ON public.attendance(enrollment_id, cycle_session_id)
            WHERE cycle_session_id IS NOT NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.student_goals (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id     UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    contrato          TEXT,
    estiramiento      TEXT,
    nabo_descripcion  TEXT,
    equipo_asistencia TEXT,
    goals_data        JSONB NOT NULL DEFAULT '{
        "professional":  {"goal": "", "purpose": "", "actions": [], "metrics": ""},
        "personal":      {"goal": "", "purpose": "", "actions": [], "metrics": ""},
        "relationships": {"goal": "", "purpose": "", "actions": [], "metrics": ""},
        "community":     {"goal": "", "purpose": "", "actions": [], "metrics": ""},
        "legacy":        {"goal": "", "purpose": "", "actions": [], "metrics": ""}
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT student_goals_enrollment_unique UNIQUE (enrollment_id)
);

CREATE TABLE IF NOT EXISTS public.weekly_checkins (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    week_number   INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 13),
    scores        JSONB NOT NULL DEFAULT '{
        "professional":  0,
        "personal":      0,
        "relationships": 0,
        "community":     0,
        "legacy":        0
    }'::jsonb,
    notes         TEXT,
    checkin_date  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT weekly_checkins_enrollment_week_unique UNIQUE (enrollment_id, week_number)
);

-- ── 1.4 Entregas (submissions) — archivos en Cloudflare R2 ──────────────────
-- La fila `submissions` es el "sobre" de una entrega/versión; los archivos
-- reales viven en submission_files (R2). Las devoluciones del coach viven en
-- submission_reviews + submission_review_files.

CREATE TABLE IF NOT EXISTS public.submissions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id        UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    storage_path     TEXT,                  -- legacy single-file (R2 → submission_files)
    file_name        TEXT,                  -- legacy single-file
    is_late          BOOLEAN NOT NULL DEFAULT false,
    version          INTEGER NOT NULL DEFAULT 1,
    -- Estado del hilo para esta versión:
    --   pending_review → coach debe responder antes de v+1
    --   reviewed       → el alumno puede subir la siguiente versión
    --   approved       → hilo cerrado
    status           TEXT NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'reviewed', 'approved')),
    approved_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at      TIMESTAMP WITH TIME ZONE,
    -- "Adicionales": permite adjuntar archivos extra a una entrega ya hecha.
    allow_additional BOOLEAN NOT NULL DEFAULT false,
    submitted_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.submission_files (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    storage_key   TEXT NOT NULL,                 -- R2 object key
    file_name     TEXT NOT NULL,
    content_type  TEXT,
    size_bytes    BIGINT,
    is_late       BOOLEAN NOT NULL DEFAULT false,
    is_additional BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.submission_reviews (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id        UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    reviewed_by          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    feedback_text        TEXT,
    revised_storage_path TEXT,                  -- legacy single revised file
    revised_file_name    TEXT,                  -- legacy single revised file
    reviewed_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Una devolución puede llevar VARIOS archivos (R2 bajo reviews/...).
CREATE TABLE IF NOT EXISTS public.submission_review_files (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id    UUID NOT NULL REFERENCES public.submission_reviews(id) ON DELETE CASCADE,
    storage_key  TEXT NOT NULL,
    file_name    TEXT NOT NULL,
    content_type TEXT,
    size_bytes   BIGINT,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Chat libre 1-a-1 alumno ↔ revisor, por (lesson_id, student_id) e independiente
-- de las versiones de entrega.
CREATE TABLE IF NOT EXISTS public.submission_chat_messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id   UUID NOT NULL REFERENCES public.lessons(id)  ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- dueño del hilo
    author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- quién escribió
    body        TEXT NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT scm_body_not_empty  CHECK (char_length(trim(body)) > 0),
    CONSTRAINT scm_body_max_length CHECK (char_length(body) <= 2000)
);

-- ── 1.5 Coach & bandeja de actividad ───────────────────────────────────────

-- Un row por par (coach, alumno). cycle_id NULL = todos los ciclos.
CREATE TABLE IF NOT EXISTS public.coach_assignments (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id           UUID REFERENCES public.cycles(id) ON DELETE CASCADE,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    created_by         UUID REFERENCES public.profiles(id),
    UNIQUE (coach_profile_id, student_profile_id, cycle_id)
);

-- Log canónico que alimenta la bandeja del admin.
-- event_type: '<actor_scope>.<verb>' (content.* / student.* / coach.*).
-- subject_profile_id = el alumno sobre el que trata el evento (NULL = plataforma).
CREATE TABLE IF NOT EXISTS public.staff_activity_events (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    event_type         TEXT NOT NULL,
    actor_profile_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role         TEXT,
    subject_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_kind        TEXT,
    target_id          UUID,
    details            JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- Estado de lectura por-admin (badge de no leídos). Presencia = "leído".
CREATE TABLE IF NOT EXISTS public.staff_activity_event_reads (
    event_id   UUID NOT NULL REFERENCES public.staff_activity_events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    PRIMARY KEY (event_id, profile_id)
);

-- ── 1.6 Formularios, pagos, configuración, logs ────────────────────────────

CREATE TABLE IF NOT EXISTS public.forms (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug        VARCHAR(100) UNIQUE NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    schema      JSONB NOT NULL DEFAULT '[]',
    is_active   BOOLEAN DEFAULT true,
    is_deleted  BOOLEAN DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.form_submissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id     UUID REFERENCES public.forms(id) ON DELETE SET NULL,
    data        JSONB NOT NULL,
    email       TEXT,
    status      VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    is_deleted  BOOLEAN NOT NULL DEFAULT false,
    deleted_at  TIMESTAMP WITH TIME ZONE,
    deleted_by  UUID,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES public.form_submissions(id) ON DELETE SET NULL,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    package_id    INTEGER REFERENCES public.packages(id) ON DELETE SET NULL,
    amount        NUMERIC,
    currency      TEXT DEFAULT 'ARS',
    method        TEXT DEFAULT 'manual',
    status        TEXT DEFAULT 'pending',
    external_id   TEXT,
    paid_at       TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.testimonials (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_name TEXT NOT NULL,
    user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cycle_text  TEXT,
    roles       TEXT[],
    quote       TEXT NOT NULL,
    rating      INTEGER DEFAULT 5,
    photo_url   TEXT,
    video_url   TEXT,
    status      TEXT DEFAULT 'pending',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.site_settings (
    key         VARCHAR(255) PRIMARY KEY,
    value       TEXT NOT NULL,
    label       VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(50) NOT NULL DEFAULT 'general',
    input_type  VARCHAR(50) NOT NULL DEFAULT 'text',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id    UUID,
    action     VARCHAR(255) NOT NULL,
    details    JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.registrations (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status     TEXT DEFAULT 'pending',
    data       JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ---------------------------------------------------------------------------
-- 2. FUNCIONES Y RPCs
-- ---------------------------------------------------------------------------

-- is_staff(): helper central de RLS. admin/sysadmin/super_admin.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'sysadmin', 'super_admin')
    );
END;
$$;

-- is_coach(): true sólo si el rol del usuario actual es 'coach'.
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
          AND role = 'coach'
    );
END;
$$;

-- is_staff_or_coach(): conveniencia para políticas que aceptan ambos.
CREATE OR REPLACE FUNCTION public.is_staff_or_coach()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN public.is_staff() OR public.is_coach();
END;
$$;

-- get_my_profile_id(): resuelve auth.uid() → profiles.id.
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- coach_oversees(subject): true si el caller es coach asignado a ese alumno.
CREATE OR REPLACE FUNCTION public.coach_oversees(subject_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    my_profile UUID;
BEGIN
    IF NOT public.is_coach() THEN
        RETURN FALSE;
    END IF;
    my_profile := public.get_my_profile_id();
    IF my_profile IS NULL OR subject_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.coach_assignments
        WHERE coach_profile_id = my_profile
          AND student_profile_id = subject_profile_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_staff()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_coach() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_oversees(UUID) TO authenticated;

-- handle_new_user(): enlaza auth.users → profiles al registrarse.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, first_name, last_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Alumno'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    )
    ON CONFLICT (email) DO UPDATE SET
        user_id    = EXCLUDED.user_id,
        first_name = CASE
                         WHEN public.profiles.first_name IS NULL OR public.profiles.first_name = 'EMPTY'
                         THEN EXCLUDED.first_name
                         ELSE public.profiles.first_name
                     END,
        last_name  = CASE
                         WHEN public.profiles.last_name IS NULL OR public.profiles.last_name = 'EMPTY'
                         THEN EXCLUDED.last_name
                         ELSE public.profiles.last_name
                     END,
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- prevent_profile_privilege_escalation(): bloquea que alumnos cambien su rol/user_id.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF NOT public.is_staff() THEN
        IF NEW.role    IS DISTINCT FROM OLD.role    THEN
            RAISE EXCEPTION 'Permission denied: cannot change role';
        END IF;
        IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'Permission denied: cannot change user_id';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- RPC: increment_enrolled_count
CREATE OR REPLACE FUNCTION public.increment_enrolled_count(p_cycle_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    UPDATE public.cycles SET enrolled_count = enrolled_count + 1 WHERE id = p_cycle_id;
END;
$$;

-- RPC: confirm_submission_enrollment
CREATE OR REPLACE FUNCTION public.confirm_submission_enrollment(
    p_submission_id    UUID,
    p_cycle_id         UUID,
    p_payment_method   VARCHAR,
    p_is_total_payment BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_sub_data      JSONB;
    v_profile_id    UUID;
    v_first_name    TEXT;
    v_last_name     TEXT;
    v_email         TEXT;
    v_enrollment_id UUID;
    v_cycle_type    TEXT;
BEGIN
    SELECT data INTO v_sub_data FROM public.form_submissions WHERE id = p_submission_id;
    IF v_sub_data IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;

    v_first_name := v_sub_data->>'firstName';
    v_last_name  := v_sub_data->>'lastName';
    v_email      := v_sub_data->>'email';

    SELECT id INTO v_profile_id FROM public.profiles WHERE email = v_email;

    IF v_profile_id IS NULL THEN
        INSERT INTO public.profiles (first_name, last_name, email, role, created_at)
        VALUES (v_first_name, v_last_name, v_email, 'student', NOW())
        RETURNING id INTO v_profile_id;
    END IF;

    INSERT INTO public.enrollments (user_id, cycle_id, status, payment_status, enrolled_at)
    VALUES (
        v_profile_id,
        p_cycle_id,
        'active',
        CASE WHEN p_is_total_payment THEN 'paid' ELSE 'pending' END,
        NOW()
    )
    RETURNING id INTO v_enrollment_id;

    UPDATE public.cycles SET enrolled_count = enrolled_count + 1 WHERE id = p_cycle_id;
    SELECT type INTO v_cycle_type FROM public.cycles WHERE id = p_cycle_id;
    UPDATE public.form_submissions SET status = 'enrolled' WHERE id = p_submission_id;

    RETURN jsonb_build_object(
        'success',       true,
        'user_id',       v_profile_id,  -- alias por compatibilidad: representa profiles.id (enrollments.user_id FK)
        'profile_id',    v_profile_id,
        'enrollment_id', v_enrollment_id,
        'cycle_type',    v_cycle_type
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- RPC: handle_linear_attendance
CREATE OR REPLACE FUNCTION public.handle_linear_attendance(
    p_enrollment_id UUID,
    p_session_id    UUID,
    p_status        TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_is_linear BOOLEAN;
    v_cycle_id  UUID;
BEGIN
    SELECT c.is_linear, c.id
    INTO v_is_linear, v_cycle_id
    FROM public.enrollments e
    JOIN public.cycles c ON c.id = e.cycle_id
    WHERE e.id = p_enrollment_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Enrollment not found');
    END IF;

    IF NOT v_is_linear THEN
        RETURN jsonb_build_object('success', true, 'action', 'no_change_non_linear');
    END IF;

    IF p_status = 'absent' THEN
        UPDATE public.enrollments
        SET status                = 'conflict',
            conflicted_at         = timezone('utc', now()),
            conflicted_session_id = p_session_id
        WHERE id = p_enrollment_id AND status != 'conflict';

        INSERT INTO public.notifications (user_id, title, body, type, action_url)
        SELECT p.id,
               'Alumno en Conflicto',
               'Un alumno ha faltado a una sesión obligatoria en un ciclo lineal.',
               'conflict',
               '/admin/dashboard'
        FROM public.profiles p
        WHERE p.role IN ('admin', 'sysadmin')
        LIMIT 5;

        RETURN jsonb_build_object('success', true, 'action', 'marked_conflict');

    ELSIF p_status IN ('present', 'late') THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.attendance
            WHERE enrollment_id = p_enrollment_id
              AND cycle_session_id != p_session_id
              AND status = 'absent'
        ) THEN
            UPDATE public.enrollments
            SET status                = 'active',
                conflicted_at         = NULL,
                conflicted_session_id = NULL
            WHERE id = p_enrollment_id AND status = 'conflict';

            RETURN jsonb_build_object('success', true, 'action', 'restored_active');
        ELSE
            RETURN jsonb_build_object('success', true, 'action', 'still_has_absences');
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'action', 'no_change');
END;
$$;

-- RPC: get_student_progress — progreso del alumno en todas sus inscripciones.
CREATE OR REPLACE FUNCTION public.get_student_progress(p_profile_id UUID DEFAULT NULL)
RETURNS TABLE (
    enrollment_id     UUID,
    enrollment_status TEXT,
    cycle_id          UUID,
    cycle_name        TEXT,
    course_id         UUID,
    course_title      TEXT,
    course_cover      TEXT,
    total_lessons     BIGINT,
    completed_lessons BIGINT,
    progress_percent  INTEGER,
    next_lesson_id    UUID,
    next_lesson_title TEXT,
    next_module_title TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_pid UUID;
BEGIN
    v_pid := COALESCE(p_profile_id, public.get_my_profile_id());
    RETURN QUERY
    WITH enrolled AS (
        SELECT e.id AS eid, e.status AS estatus, c.id AS cid, c.name AS cname,
               co.id AS coid, co.title AS ctitle, co.cover_image_url AS ccover
        FROM enrollments e
        JOIN cycles c ON c.id = e.cycle_id
        LEFT JOIN courses co ON co.id = c.course_id
        WHERE e.user_id = v_pid AND e.status IN ('active','completed')
    ),
    lesson_counts AS (
        SELECT en.coid,
               COUNT(l.id) AS total,
               COUNT(lp.id) FILTER (WHERE lp.completed) AS done
        FROM enrolled en
        JOIN modules m ON m.course_id = en.coid AND m.is_published
        JOIN lessons l ON l.module_id = m.id AND l.is_published
        LEFT JOIN lesson_progress lp
          ON lp.lesson_id = l.id AND lp.user_id = v_pid AND lp.completed
        GROUP BY en.coid
    ),
    next_lessons AS (
        SELECT DISTINCT ON (en.coid)
               en.coid, l.id AS nlid, l.title AS nltitle, m.title AS nmtitle
        FROM enrolled en
        JOIN modules m ON m.course_id = en.coid AND m.is_published
        JOIN lessons l ON l.module_id = m.id AND l.is_published
        LEFT JOIN lesson_progress lp
          ON lp.lesson_id = l.id AND lp.user_id = v_pid AND lp.completed
        WHERE lp.id IS NULL
        ORDER BY en.coid, m.order_index, l.order_index
    )
    SELECT en.eid, en.estatus, en.cid, en.cname, en.coid, en.ctitle, en.ccover,
           COALESCE(lc.total,0), COALESCE(lc.done,0),
           CASE WHEN COALESCE(lc.total,0)>0
                THEN (COALESCE(lc.done,0)*100/lc.total)::INTEGER ELSE 0 END,
           nl.nlid, nl.nltitle, nl.nmtitle
    FROM enrolled en
    LEFT JOIN lesson_counts lc ON lc.coid = en.coid
    LEFT JOIN next_lessons nl ON nl.coid = en.coid;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_student_progress(UUID) TO authenticated;

-- RPC: staff_activity_unread_count — badge de no leídos del admin/coach.
CREATE OR REPLACE FUNCTION public.staff_activity_unread_count()
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    my_profile UUID;
    cnt INTEGER;
BEGIN
    my_profile := public.get_my_profile_id();
    IF my_profile IS NULL THEN
        RETURN 0;
    END IF;

    IF public.is_staff() THEN
        SELECT count(*) INTO cnt
        FROM public.staff_activity_events e
        WHERE NOT EXISTS (
            SELECT 1 FROM public.staff_activity_event_reads r
            WHERE r.event_id = e.id AND r.profile_id = my_profile
        );
    ELSIF public.is_coach() THEN
        SELECT count(*) INTO cnt
        FROM public.staff_activity_events e
        WHERE (e.subject_profile_id IS NULL OR public.coach_oversees(e.subject_profile_id))
          AND NOT EXISTS (
              SELECT 1 FROM public.staff_activity_event_reads r
              WHERE r.event_id = e.id AND r.profile_id = my_profile
          );
    ELSE
        cnt := 0;
    END IF;

    RETURN COALESCE(cnt, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_activity_unread_count() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

-- Habilitar RLS en todas las tablas públicas.
DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- Política base: staff (is_staff) tiene acceso total a TODAS las tablas.
-- Las políticas de abajo sólo AÑADEN acceso para alumnos/coaches/anónimos.
DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS staff_all_access ON public.%I', t);
        EXECUTE format(
            'CREATE POLICY staff_all_access ON public.%I FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())',
            t
        );
    END LOOP;
END $$;

-- ── Acceso público / anónimo ───────────────────────────────────────────────

DROP POLICY IF EXISTS public_insert_forms       ON public.form_submissions;
DROP POLICY IF EXISTS public_read_testimonials   ON public.testimonials;
DROP POLICY IF EXISTS public_insert_testimonials ON public.testimonials;
DROP POLICY IF EXISTS public_read_forms          ON public.forms;
DROP POLICY IF EXISTS public_read_cycles         ON public.cycles;

CREATE POLICY public_insert_forms
    ON public.form_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY public_read_testimonials
    ON public.testimonials FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY public_insert_testimonials
    ON public.testimonials FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY public_read_forms
    ON public.forms FOR SELECT TO anon, authenticated USING (is_deleted IS NOT TRUE);

CREATE POLICY public_read_cycles
    ON public.cycles FOR SELECT TO anon, authenticated USING (true);

-- ── Perfil del alumno ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Students can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON public.profiles;

CREATE POLICY "Students can view own profile"
    ON public.profiles FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Students can update own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ── Enrollments / cycles / payments / sessions / attendance ────────────────

DROP POLICY IF EXISTS "Students can view own enrollments" ON public.enrollments;
CREATE POLICY "Students can view own enrollments"
    ON public.enrollments FOR SELECT TO authenticated
    USING (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Students can view enrolled cycles" ON public.cycles;
CREATE POLICY "Students can view enrolled cycles"
    ON public.cycles FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT cycle_id FROM public.enrollments
            WHERE user_id = public.get_my_profile_id()
        )
    );

DROP POLICY IF EXISTS "Students can view own payments" ON public.payments;
CREATE POLICY "Students can view own payments"
    ON public.payments FOR SELECT TO authenticated
    USING (
        enrollment_id IN (
            SELECT id FROM public.enrollments
            WHERE user_id = public.get_my_profile_id()
        )
    );

DROP POLICY IF EXISTS "Authenticated can view cycle sessions" ON public.cycle_sessions;
CREATE POLICY "Authenticated can view cycle sessions"
    ON public.cycle_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance;
CREATE POLICY "Students can view own attendance"
    ON public.attendance FOR SELECT TO authenticated
    USING (
        enrollment_id IN (
            SELECT id FROM public.enrollments
            WHERE user_id = public.get_my_profile_id()
        )
    );

-- ── LMS (courses / modules / lessons / videos / resources) ─────────────────

DROP POLICY IF EXISTS "Users can view published courses" ON public.courses;
CREATE POLICY "Users can view published courses"
    ON public.courses FOR SELECT TO authenticated
    USING (is_published = true OR public.is_staff());

DROP POLICY IF EXISTS "Users can view published modules" ON public.modules;
CREATE POLICY "Users can view published modules"
    ON public.modules FOR SELECT TO authenticated
    USING (is_published = true OR public.is_staff());

DROP POLICY IF EXISTS "Users can view published lessons" ON public.lessons;
CREATE POLICY "Users can view published lessons"
    ON public.lessons FOR SELECT TO authenticated
    USING (is_published = true OR public.is_staff());

DROP POLICY IF EXISTS "lesson_videos_select" ON public.lesson_videos;
CREATE POLICY "lesson_videos_select"
    ON public.lesson_videos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view lesson resources" ON public.lesson_resources;
CREATE POLICY "Users can view lesson resources"
    ON public.lesson_resources FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view course sessions" ON public.course_sessions;
CREATE POLICY "Authenticated can view course sessions"
    ON public.course_sessions FOR SELECT TO authenticated
    USING (
        course_id IN (
            SELECT id FROM public.courses
            WHERE is_published = true OR public.is_staff()
        )
    );

-- ── Lesson progress / resource opens ───────────────────────────────────────

DROP POLICY IF EXISTS "Students can view own progress"   ON public.lesson_progress;
DROP POLICY IF EXISTS "Students can insert own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Students can update own progress" ON public.lesson_progress;

CREATE POLICY "Students can view own progress"
    ON public.lesson_progress FOR SELECT TO authenticated
    USING (user_id = public.get_my_profile_id());

CREATE POLICY "Students can insert own progress"
    ON public.lesson_progress FOR INSERT TO authenticated
    WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Students can update own progress"
    ON public.lesson_progress FOR UPDATE TO authenticated
    USING (user_id = public.get_my_profile_id())
    WITH CHECK (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Students can view own resource opens"   ON public.resource_opens;
DROP POLICY IF EXISTS "Students can insert own resource opens" ON public.resource_opens;

CREATE POLICY "Students can view own resource opens"
    ON public.resource_opens FOR SELECT TO authenticated
    USING (user_id = public.get_my_profile_id());

CREATE POLICY "Students can insert own resource opens"
    ON public.resource_opens FOR INSERT TO authenticated
    WITH CHECK (user_id = public.get_my_profile_id());

-- ── Forum posts ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Students can view forum posts"       ON public.forum_posts;
DROP POLICY IF EXISTS "Students can insert own forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Students can update own forum posts" ON public.forum_posts;

CREATE POLICY "Students can view forum posts"
    ON public.forum_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students can insert own forum posts"
    ON public.forum_posts FOR INSERT TO authenticated
    WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Students can update own forum posts"
    ON public.forum_posts FOR UPDATE TO authenticated
    USING (user_id = public.get_my_profile_id())
    WITH CHECK (user_id = public.get_my_profile_id());

-- ── Medical info / notifications / checkins / student goals ────────────────

DROP POLICY IF EXISTS "Students can view own medical info"   ON public.medical_info;
DROP POLICY IF EXISTS "Students can insert own medical info" ON public.medical_info;
DROP POLICY IF EXISTS "Students can update own medical info" ON public.medical_info;

CREATE POLICY "Students can view own medical info"
    ON public.medical_info FOR SELECT TO authenticated
    USING (user_id = public.get_my_profile_id());

CREATE POLICY "Students can insert own medical info"
    ON public.medical_info FOR INSERT TO authenticated
    WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Students can update own medical info"
    ON public.medical_info FOR UPDATE TO authenticated
    USING (user_id = public.get_my_profile_id())
    WITH CHECK (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Students can view own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Students can update own notifications" ON public.notifications;

CREATE POLICY "Students can view own notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (user_id = public.get_my_profile_id());

CREATE POLICY "Students can update own notifications"
    ON public.notifications FOR UPDATE TO authenticated
    USING (user_id = public.get_my_profile_id())
    WITH CHECK (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Students can view own checkins"   ON public.weekly_checkins;
DROP POLICY IF EXISTS "Students can insert own checkins" ON public.weekly_checkins;
DROP POLICY IF EXISTS "Students can update own checkins" ON public.weekly_checkins;

CREATE POLICY "Students can view own checkins"
    ON public.weekly_checkins FOR SELECT TO authenticated
    USING (
        enrollment_id IN (
            SELECT id FROM public.enrollments WHERE user_id = public.get_my_profile_id()
        )
    );

CREATE POLICY "Students can insert own checkins"
    ON public.weekly_checkins FOR INSERT TO authenticated
    WITH CHECK (
        enrollment_id IN (
            SELECT id FROM public.enrollments WHERE user_id = public.get_my_profile_id()
        )
    );

CREATE POLICY "Students can update own checkins"
    ON public.weekly_checkins FOR UPDATE TO authenticated
    USING (
        enrollment_id IN (
            SELECT id FROM public.enrollments WHERE user_id = public.get_my_profile_id()
        )
    );

DROP POLICY IF EXISTS "Students can view own goals" ON public.student_goals;
CREATE POLICY "Students can view own goals"
    ON public.student_goals FOR SELECT TO authenticated
    USING (
        enrollment_id IN (
            SELECT id FROM public.enrollments WHERE user_id = public.get_my_profile_id()
        )
    );

-- ── Entregas: submissions / files / reviews / chat ─────────────────────────
-- (staff cubierto por staff_all_access; aquí se añade alumno + coach.)

DROP POLICY IF EXISTS "Students can view own submissions"   ON public.submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
DROP POLICY IF EXISTS "coach_submissions_select"            ON public.submissions;
DROP POLICY IF EXISTS "coach_submissions_update"            ON public.submissions;

CREATE POLICY "Students can view own submissions"
    ON public.submissions FOR SELECT TO authenticated
    USING (user_id = public.get_my_profile_id());

CREATE POLICY "Students can insert own submissions"
    ON public.submissions FOR INSERT TO authenticated
    WITH CHECK (user_id = public.get_my_profile_id());

-- Coaches: ven todo y pueden cambiar el estado (reviewed/approved); nunca borran.
CREATE POLICY "coach_submissions_select"
    ON public.submissions FOR SELECT TO authenticated
    USING (public.is_coach());

CREATE POLICY "coach_submissions_update"
    ON public.submissions FOR UPDATE TO authenticated
    USING (public.is_coach());

DROP POLICY IF EXISTS "sf_student_select"   ON public.submission_files;
DROP POLICY IF EXISTS "sf_student_insert"   ON public.submission_files;
DROP POLICY IF EXISTS "sf_reviewer_select"  ON public.submission_files;

CREATE POLICY "sf_student_select"
    ON public.submission_files FOR SELECT TO authenticated
    USING (
        submission_id IN (
            SELECT id FROM public.submissions WHERE user_id = public.get_my_profile_id()
        )
    );

CREATE POLICY "sf_student_insert"
    ON public.submission_files FOR INSERT TO authenticated
    WITH CHECK (
        submission_id IN (
            SELECT id FROM public.submissions WHERE user_id = public.get_my_profile_id()
        )
    );

-- Coaches: leen todos los archivos (admins ya vía staff_all_access). Sólo admin borra.
CREATE POLICY "sf_reviewer_select"
    ON public.submission_files FOR SELECT TO authenticated
    USING (public.is_coach());

DROP POLICY IF EXISTS "student_reviews_select" ON public.submission_reviews;
DROP POLICY IF EXISTS "coach_reviews_all"      ON public.submission_reviews;

CREATE POLICY "student_reviews_select"
    ON public.submission_reviews FOR SELECT TO authenticated
    USING (
        submission_id IN (
            SELECT id FROM public.submissions WHERE user_id = public.get_my_profile_id()
        )
    );

CREATE POLICY "coach_reviews_all"
    ON public.submission_reviews FOR ALL TO authenticated
    USING (public.is_coach()) WITH CHECK (public.is_coach());

DROP POLICY IF EXISTS srf_student_select ON public.submission_review_files;
DROP POLICY IF EXISTS srf_reviewer_all   ON public.submission_review_files;

CREATE POLICY srf_student_select
    ON public.submission_review_files FOR SELECT TO authenticated
    USING (
        review_id IN (
            SELECT r.id FROM public.submission_reviews r
            JOIN public.submissions s ON s.id = r.submission_id
            WHERE s.user_id = public.get_my_profile_id()
        )
    );

CREATE POLICY srf_reviewer_all
    ON public.submission_review_files FOR ALL TO authenticated
    USING (public.is_coach()) WITH CHECK (public.is_coach());

DROP POLICY IF EXISTS "scm_student_select"  ON public.submission_chat_messages;
DROP POLICY IF EXISTS "scm_student_insert"  ON public.submission_chat_messages;
DROP POLICY IF EXISTS "scm_reviewer_select" ON public.submission_chat_messages;
DROP POLICY IF EXISTS "scm_reviewer_insert" ON public.submission_chat_messages;

CREATE POLICY "scm_student_select"
    ON public.submission_chat_messages FOR SELECT TO authenticated
    USING (student_id = public.get_my_profile_id());

CREATE POLICY "scm_student_insert"
    ON public.submission_chat_messages FOR INSERT TO authenticated
    WITH CHECK (
        student_id = public.get_my_profile_id()
        AND author_id = public.get_my_profile_id()
    );

CREATE POLICY "scm_reviewer_select"
    ON public.submission_chat_messages FOR SELECT TO authenticated
    USING (public.is_coach());

CREATE POLICY "scm_reviewer_insert"
    ON public.submission_chat_messages FOR INSERT TO authenticated
    WITH CHECK (public.is_coach() AND author_id = public.get_my_profile_id());

-- ── Coach assignments / staff activity feed ────────────────────────────────

DROP POLICY IF EXISTS coach_view_own ON public.coach_assignments;
CREATE POLICY coach_view_own ON public.coach_assignments
    FOR SELECT TO authenticated
    USING (public.is_coach() AND coach_profile_id = public.get_my_profile_id());

-- Coaches ven eventos de sus alumnos + eventos de plataforma (subject NULL).
DROP POLICY IF EXISTS coach_view_scoped ON public.staff_activity_events;
CREATE POLICY coach_view_scoped ON public.staff_activity_events
    FOR SELECT TO authenticated
    USING (
        public.is_coach()
        AND (subject_profile_id IS NULL OR public.coach_oversees(subject_profile_id))
    );

-- Cualquiera puede registrar eventos sobre SUS PROPIAS acciones.
DROP POLICY IF EXISTS self_insert ON public.staff_activity_events;
CREATE POLICY self_insert ON public.staff_activity_events
    FOR INSERT TO authenticated
    WITH CHECK (actor_profile_id = public.get_my_profile_id());

-- Cada admin/coach gestiona sólo su propio estado de lectura.
DROP POLICY IF EXISTS own_reads ON public.staff_activity_event_reads;
CREATE POLICY own_reads ON public.staff_activity_event_reads
    FOR ALL TO authenticated
    USING (profile_id = public.get_my_profile_id())
    WITH CHECK (profile_id = public.get_my_profile_id());

-- ---------------------------------------------------------------------------
-- 4. STORAGE (bucket privado 'submissions' — devoluciones legacy)
-- ---------------------------------------------------------------------------
-- Nota: las entregas nuevas viven en Cloudflare R2 (bucket campus-entregas).
-- Este bucket de Supabase Storage se mantiene para archivos legacy/devoluciones.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'submissions', 'submissions', false, 52428800,
    ARRAY[
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
    ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Students can upload own submissions"   ON storage.objects;
DROP POLICY IF EXISTS "Students can read own submissions"     ON storage.objects;
DROP POLICY IF EXISTS "Staff can manage all submission files" ON storage.objects;
DROP POLICY IF EXISTS "coaches_submissions_storage_all"       ON storage.objects;
DROP POLICY IF EXISTS "students_read_revised_files"           ON storage.objects;

CREATE POLICY "Students can upload own submissions"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'submissions'
        AND (storage.foldername(name))[1] = public.get_my_profile_id()::text
    );

CREATE POLICY "Students can read own submissions"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'submissions'
        AND (storage.foldername(name))[1] = public.get_my_profile_id()::text
    );

CREATE POLICY "Staff can manage all submission files"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'submissions' AND public.is_staff())
    WITH CHECK (bucket_id = 'submissions' AND public.is_staff());

CREATE POLICY "coaches_submissions_storage_all"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'submissions' AND public.is_coach())
    WITH CHECK (bucket_id = 'submissions' AND public.is_coach());

-- Devoluciones viven en reviews/{submission_id}/...; el alumno puede leerlas.
CREATE POLICY "students_read_revised_files"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'submissions'
        AND split_part(name, '/', 1) = 'reviews'
        AND EXISTS (
            SELECT 1
            FROM   public.submissions s
            JOIN   public.profiles    p ON p.id = s.user_id
            WHERE  p.user_id = auth.uid()
              AND  s.id::text = split_part(name, '/', 2)
        )
    );

-- ---------------------------------------------------------------------------
-- 5. REALTIME
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    t TEXT;
    rt_tables TEXT[] := ARRAY[
        'form_submissions', 'profiles', 'enrollments', 'cycles', 'attendance',
        'cycle_sessions', 'course_sessions', 'staff_activity_events',
        'submission_chat_messages'
    ];
BEGIN
    FOREACH t IN ARRAY rt_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. PERMISOS
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Privilegios por defecto: toda tabla/secuencia futura en public es accesible
-- por authenticated sin necesidad de un GRANT explícito.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. INDEXES
-- ---------------------------------------------------------------------------

-- Identidad / CRM
CREATE INDEX IF NOT EXISTS idx_profiles_user_id           ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted         ON public.profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id       ON public.notifications(user_id);

-- Ciclos / inscripciones / asistencia
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id         ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_cycle_id        ON public.enrollments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status          ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_id    ON public.attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_cycles_start_date           ON public.cycles(start_date);
CREATE INDEX IF NOT EXISTS idx_cycles_is_linear            ON public.cycles(is_linear);
CREATE INDEX IF NOT EXISTS idx_student_goals_enrollment    ON public.student_goals(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_enrollment  ON public.weekly_checkins(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_week        ON public.weekly_checkins(enrollment_id, week_number);

-- LMS
CREATE INDEX IF NOT EXISTS idx_lessons_status              ON public.lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_unlock_at           ON public.lessons(unlock_at);
CREATE INDEX IF NOT EXISTS lesson_videos_lesson_order_idx  ON public.lesson_videos(lesson_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id     ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_opens_user_id      ON public.resource_opens(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_opens_resource_id  ON public.resource_opens(lesson_resource_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id         ON public.forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_lesson_id       ON public.forum_posts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_course_lesson   ON public.forum_posts(course_id, lesson_id);
CREATE INDEX IF NOT EXISTS course_sessions_course_id_idx   ON public.course_sessions(course_id);
CREATE INDEX IF NOT EXISTS course_sessions_session_date_idx ON public.course_sessions(session_date);

-- Entregas
CREATE INDEX IF NOT EXISTS idx_submissions_user_lesson        ON public.submissions(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_submissions_lesson_id          ON public.submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at       ON public.submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS submissions_user_lesson_status_idx ON public.submissions(user_id, lesson_id, status);
CREATE INDEX IF NOT EXISTS submission_files_submission_idx    ON public.submission_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_submission_id ON public.submission_reviews(submission_id);
CREATE INDEX IF NOT EXISTS srf_review_idx                     ON public.submission_review_files(review_id);
CREATE INDEX IF NOT EXISTS scm_thread_idx                     ON public.submission_chat_messages(lesson_id, student_id, created_at ASC);

-- Coach / actividad
CREATE INDEX IF NOT EXISTS coach_assignments_coach_idx        ON public.coach_assignments(coach_profile_id);
CREATE INDEX IF NOT EXISTS coach_assignments_student_idx      ON public.coach_assignments(student_profile_id);
CREATE INDEX IF NOT EXISTS staff_activity_events_created_at_idx ON public.staff_activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS staff_activity_events_event_type_idx ON public.staff_activity_events(event_type);
CREATE INDEX IF NOT EXISTS staff_activity_events_subject_idx  ON public.staff_activity_events(subject_profile_id);
CREATE INDEX IF NOT EXISTS staff_activity_events_actor_idx    ON public.staff_activity_events(actor_profile_id);
CREATE INDEX IF NOT EXISTS staff_activity_event_reads_profile_idx ON public.staff_activity_event_reads(profile_id);

-- Formularios
CREATE INDEX IF NOT EXISTS idx_form_submissions_email      ON public.form_submissions(email);
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_deleted ON public.form_submissions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status     ON public.form_submissions(status);

-- ---------------------------------------------------------------------------
-- 8. BACKFILLS (no-ops en base nueva; reconcilian bases ya provisionadas)
-- ---------------------------------------------------------------------------

-- form_submissions.email desde data->>'email' (AdminStudents/AdminCalendar
-- consultan por la columna indexada con .in('email', ...)).
UPDATE public.form_submissions
   SET email = LOWER(TRIM(data->>'email'))
 WHERE email IS NULL
   AND data ? 'email'
   AND TRIM(data->>'email') <> '';

-- Módulos "taller" / "institucional" por heurística de título.
UPDATE public.modules SET module_type = 'workshop'
 WHERE module_type = 'module' AND lower(title) LIKE '%taller%';
UPDATE public.modules SET module_type = 'institutional'
 WHERE lower(title) LIKE '%archivos institucionales%'
    OR lower(title) LIKE '%archivos institucional%';

-- Usuarios con foto ya cargada se consideran onboarding completo.
UPDATE public.profiles SET profile_completed_at = NOW()
 WHERE avatar_url IS NOT NULL AND profile_completed_at IS NULL;

-- Sembrar lesson_videos desde lecciones con video único legacy.
INSERT INTO public.lesson_videos (lesson_id, video_url, duration_seconds, order_index)
SELECT id, video_url, COALESCE(duration_seconds, 0), 1
FROM   public.lessons
WHERE  video_url IS NOT NULL AND video_url <> ''
ON CONFLICT DO NOTHING;

-- Entregas con devolución previa → marcar 'reviewed'.
UPDATE public.submissions s SET status = 'reviewed'
 WHERE status = 'pending_review'
   AND EXISTS (SELECT 1 FROM public.submission_reviews r WHERE r.submission_id = s.id);

-- ---------------------------------------------------------------------------
-- 9. SEED
-- ---------------------------------------------------------------------------

INSERT INTO public.site_settings (key, value, label, description, category, input_type) VALUES
('contact_email',            'contacto@home-experience.com', 'Email de Contacto',         'Email visible en el pie de página',                  'contact', 'email'),
('contact_phone',            '+54 9 11 1234-5678',           'Teléfono de Contacto',       'Número visible para WhatsApp o llamadas',             'contact', 'text'),
('whatsapp',                 '+5491130586930',                'WhatsApp',                  'Número de WhatsApp para contacto directo.',           'contact', 'tel'),
('phone',                    '+5491130586930',                'Teléfono de llamadas',       'Número para recibir llamadas.',                       'contact', 'tel'),
('price_initial',            '45000',                         'Precio: Inicial',            'Costo del curso Inicial',                            'pricing', 'text'),
('price_advanced',           '55000',                         'Precio: Avanzado',           'Costo del curso Avanzado',                           'pricing', 'text'),
('price_leadership',         '75000',                         'Precio: Liderazgo',          'Costo del curso Liderazgo',                          'pricing', 'text'),
('price_combo_1_cash',       '340000',                        'Combo 1 (Efectivo)',          'Inicial + Avanzado (Efectivo)',                       'pricing', 'text'),
('price_combo_1_card',       '480000',                        'Combo 1 (Tarjeta)',           'Inicial + Avanzado (Tarjeta)',                        'pricing', 'text'),
('price_combo_2_cash',       '630000',                        'Combo 2 (Efectivo)',          'Inicial + Avanzado + Liderazgo (Efectivo)',           'pricing', 'text'),
('price_combo_2_card',       '790000',                        'Combo 2 (Tarjeta)',           'Inicial + Avanzado + Liderazgo (Tarjeta)',            'pricing', 'text'),
('link_mercadopago_initial',     'https://mp.ago.la/...', 'Link Pago: Inicial',     'Link de pago para curso Inicial',    'links', 'url'),
('link_mercadopago_advanced',    'https://mp.ago.la/...', 'Link Pago: Avanzado',    'Link de pago para curso Avanzado',   'links', 'url'),
('link_mercadopago_leadership',  'https://mp.ago.la/...', 'Link Pago: Liderazgo',   'Link de pago para curso Liderazgo',  'links', 'url')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.forms (slug, title, schema, is_active)
VALUES (
    'inscripcion-creser',
    'Inscripción CRESER',
    '[
        {"id": "firstName",    "type": "text",     "label": "Nombre",                                   "required": true,  "section": "personal"},
        {"id": "lastName",     "type": "text",     "label": "Apellido",                                 "required": true,  "section": "personal"},
        {"id": "age",          "type": "text",     "label": "Edad",                                     "required": true,  "section": "personal"},
        {"id": "dni",          "type": "text",     "label": "DNI",                                      "required": true,  "section": "personal"},
        {"id": "gender",       "type": "radio",    "label": "Género",                                   "required": true,  "section": "personal", "options": ["Masculino","Femenino","Prefiero no decirlo","Otro"]},
        {"id": "phone",        "type": "tel",      "label": "Celular (WhatsApp)",                       "required": true,  "section": "personal"},
        {"id": "email",        "type": "email",    "label": "Correo electrónico",                       "required": true,  "section": "personal"},
        {"id": "instagram",    "type": "text",     "label": "Instagram (Opcional)",                     "required": false, "section": "personal"},
        {"id": "intention",    "type": "textarea", "label": "¿Qué buscás en esta experiencia?",        "required": true,  "section": "dreams"},
        {"id": "underTreatment","type":"radio",    "label": "¿Estás bajo tratamiento médico/psicológico?","required":true,"section":"medical","options":["Sí","No"]},
        {"id": "medication",   "type": "radio",    "label": "¿Tomás alguna medicación?",               "required": true,  "section": "medical", "options": ["Sí","No"]},
        {"id": "allergies",    "type": "radio",    "label": "¿Tenés alergias o condiciones físicas?",  "required": true,  "section": "medical", "options": ["Sí","No"]},
        {"id": "emergencyName","type": "text",     "label": "Nombre Contacto Emergencia",              "required": true,  "section": "personal"},
        {"id": "emergencyPhone","type":"tel",      "label": "Teléfono Contacto Emergencia",            "required": true,  "section": "personal"}
    ]'::jsonb,
    true
)
ON CONFLICT (slug) DO UPDATE SET schema = EXCLUDED.schema;

-- Recargar el schema cache de PostgREST tras aplicar.
NOTIFY pgrst, 'reload schema';
