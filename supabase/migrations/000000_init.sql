-- =============================================================================
-- HOME Experience / CRESER — Schema unificado
-- Squash de las migraciones 000000 → 000014
-- Aplica en orden; es idempotente (IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. TABLAS BASE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID UNIQUE,
    email       TEXT UNIQUE,
    first_name  TEXT,
    last_name   TEXT,
    phone       TEXT,
    avatar_url  TEXT,
    role        TEXT DEFAULT 'student',
    bio         TEXT,
    instagram   TEXT,
    is_deleted  BOOLEAN NOT NULL DEFAULT false,
    deleted_at  TIMESTAMP WITH TIME ZONE,
    deleted_by  UUID,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.packages (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    price       NUMERIC,
    duration_days INTEGER,
    stage_order INTEGER NOT NULL DEFAULT 1,
    is_active   BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.courses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    description     TEXT,
    cover_image_url TEXT,
    is_published    BOOLEAN DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS public.enrollment_notes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    content       TEXT NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
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

CREATE TABLE IF NOT EXISTS public.student_goals (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id    UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    contrato         TEXT,
    estiramiento     TEXT,
    nabo_descripcion TEXT,
    equipo_asistencia TEXT,
    goals_data       JSONB NOT NULL DEFAULT '{
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
    key        VARCHAR(255) PRIMARY KEY,
    value      TEXT NOT NULL,
    label      VARCHAR(255) NOT NULL,
    description TEXT,
    category   VARCHAR(50) NOT NULL DEFAULT 'general',
    input_type VARCHAR(50) NOT NULL DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.forms (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug       VARCHAR(100) UNIQUE NOT NULL,
    title      VARCHAR(255) NOT NULL,
    description TEXT,
    schema     JSONB NOT NULL DEFAULT '[]',
    is_active  BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
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

-- LMS
CREATE TABLE IF NOT EXISTS public.modules (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id        UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT,
    video_url        TEXT,
    duration_seconds INTEGER DEFAULT 0,
    order_index      INTEGER NOT NULL,
    is_published     BOOLEAN DEFAULT false,
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
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (user_id, lesson_id)
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

-- ---------------------------------------------------------------------------
-- 2. FUNCIONES Y RPCs
-- ---------------------------------------------------------------------------

-- is_staff(): helper central para todas las políticas RLS
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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

-- get_my_profile_id(): resuelve auth.uid() → profiles.id
-- Necesario porque lesson_progress/forum_posts usan profiles.id, no auth.uid()
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO authenticated;

-- handle_new_user(): trigger que enlaza auth.users → profiles al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- prevent_profile_privilege_escalation(): bloquea que alumnos cambien su propio rol
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    UPDATE public.cycles SET enrolled_count = enrolled_count + 1 WHERE id = p_cycle_id;
END;
$$;

-- RPC: confirm_submission_enrollment
CREATE OR REPLACE FUNCTION public.confirm_submission_enrollment(
    p_submission_id   UUID,
    p_cycle_id        UUID,
    p_payment_method  VARCHAR,
    p_is_total_payment BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

-- Habilitar RLS en todas las tablas públicas
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- Política base: staff tiene acceso total a todo
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS staff_all_access ON public.%I', t);
        EXECUTE format(
            'CREATE POLICY staff_all_access ON public.%I FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())',
            t
        );
    END LOOP;
END $$;

-- ── Acceso público / anónimo ──────────────────────────────────────────────────

DROP POLICY IF EXISTS public_insert_forms     ON public.form_submissions;
DROP POLICY IF EXISTS public_read_testimonials ON public.testimonials;
DROP POLICY IF EXISTS public_insert_testimonials ON public.testimonials;
DROP POLICY IF EXISTS public_read_forms       ON public.forms;
DROP POLICY IF EXISTS public_read_cycles      ON public.cycles;

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

-- ── Perfil del alumno ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Students can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON public.profiles;

CREATE POLICY "Students can view own profile"
    ON public.profiles FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Students can update own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ── Enrollments (alumno ve los suyos) ────────────────────────────────────────

DROP POLICY IF EXISTS "Students can view own enrollments" ON public.enrollments;

CREATE POLICY "Students can view own enrollments"
    ON public.enrollments FOR SELECT TO authenticated
    USING (user_id = public.get_my_profile_id());

-- ── Cycles (alumno ve los ciclos en que está inscripto) ──────────────────────
-- public_read_cycles ya permite a todos ver ciclos; esta es adicional/explícita.

DROP POLICY IF EXISTS "Students can view enrolled cycles" ON public.cycles;

CREATE POLICY "Students can view enrolled cycles"
    ON public.cycles FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT cycle_id FROM public.enrollments
            WHERE user_id = public.get_my_profile_id()
        )
    );

-- ── Payments ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Students can view own payments" ON public.payments;

CREATE POLICY "Students can view own payments"
    ON public.payments FOR SELECT TO authenticated
    USING (
        enrollment_id IN (
            SELECT id FROM public.enrollments
            WHERE user_id = public.get_my_profile_id()
        )
    );

-- ── Cycle Sessions ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated can view cycle sessions" ON public.cycle_sessions;

CREATE POLICY "Authenticated can view cycle sessions"
    ON public.cycle_sessions FOR SELECT TO authenticated USING (true);

-- ── Attendance ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance;

CREATE POLICY "Students can view own attendance"
    ON public.attendance FOR SELECT TO authenticated
    USING (
        enrollment_id IN (
            SELECT id FROM public.enrollments
            WHERE user_id = public.get_my_profile_id()
        )
    );

-- ── Courses (LMS) ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view published courses" ON public.courses;

CREATE POLICY "Users can view published courses"
    ON public.courses FOR SELECT TO authenticated
    USING (is_published = true OR public.is_staff());

-- ── Modules ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view published modules" ON public.modules;

CREATE POLICY "Users can view published modules"
    ON public.modules FOR SELECT TO authenticated
    USING (is_published = true OR public.is_staff());

-- ── Lessons ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view published lessons" ON public.lessons;

CREATE POLICY "Users can view published lessons"
    ON public.lessons FOR SELECT TO authenticated
    USING (is_published = true OR public.is_staff());

-- ── Lesson Resources ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view lesson resources" ON public.lesson_resources;

CREATE POLICY "Users can view lesson resources"
    ON public.lesson_resources FOR SELECT TO authenticated USING (true);

-- ── Lesson Progress ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Staff can manage all progress"   ON public.lesson_progress;
DROP POLICY IF EXISTS "Students can view own progress"  ON public.lesson_progress;
DROP POLICY IF EXISTS "Students can insert own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Students can update own progress" ON public.lesson_progress;

CREATE POLICY "Staff can manage all progress"
    ON public.lesson_progress FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

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

-- ── Forum Posts ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Staff can manage all forum posts"    ON public.forum_posts;
DROP POLICY IF EXISTS "Students can view forum posts"       ON public.forum_posts;
DROP POLICY IF EXISTS "Students can insert own forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Students can update own forum posts" ON public.forum_posts;

CREATE POLICY "Staff can manage all forum posts"
    ON public.forum_posts FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Students can view forum posts"
    ON public.forum_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students can insert own forum posts"
    ON public.forum_posts FOR INSERT TO authenticated
    WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Students can update own forum posts"
    ON public.forum_posts FOR UPDATE TO authenticated
    USING (user_id = public.get_my_profile_id())
    WITH CHECK (user_id = public.get_my_profile_id());

-- ── Medical Info ──────────────────────────────────────────────────────────────

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

-- ── Notifications ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Students can view own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Students can update own notifications" ON public.notifications;

CREATE POLICY "Students can view own notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (user_id = public.get_my_profile_id());

CREATE POLICY "Students can update own notifications"
    ON public.notifications FOR UPDATE TO authenticated
    USING (user_id = public.get_my_profile_id())
    WITH CHECK (user_id = public.get_my_profile_id());

-- ── Weekly Checkins ───────────────────────────────────────────────────────────

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

-- ── Student Goals ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Students can view own goals" ON public.student_goals;

CREATE POLICY "Students can view own goals"
    ON public.student_goals FOR SELECT TO authenticated
    USING (
        enrollment_id IN (
            SELECT id FROM public.enrollments WHERE user_id = public.get_my_profile_id()
        )
    );

-- ---------------------------------------------------------------------------
-- 4. REALTIME
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.form_submissions; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;         EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;      EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cycles;           EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;       EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cycle_sessions;   EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- ---------------------------------------------------------------------------
-- 5. PERMISOS
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_user_id          ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted        ON public.profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id        ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_cycle_id       ON public.enrollments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status         ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_id   ON public.attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_cycles_start_date          ON public.cycles(start_date);
CREATE INDEX IF NOT EXISTS idx_cycles_is_linear           ON public.cycles(is_linear);
CREATE INDEX IF NOT EXISTS idx_form_submissions_email     ON public.form_submissions(email);
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_deleted ON public.form_submissions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status    ON public.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_student_goals_enrollment   ON public.student_goals(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_enrollment ON public.weekly_checkins(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_week       ON public.weekly_checkins(enrollment_id, week_number);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id    ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id        ON public.forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_lesson_id      ON public.forum_posts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_course_lesson  ON public.forum_posts(course_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id      ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_student_goals_enrollment_id ON public.student_goals(enrollment_id);

-- ---------------------------------------------------------------------------
-- 7. SEED: Configuración del sitio
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

-- Formulario principal de inscripción CRESER
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
