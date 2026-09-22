-- ─────────────────────────────────────────────────────────────────────────────
-- 000005 — Esquema CRM (3FN): datos extendidos de personas, tags, notas de
-- perfil, seguimiento de egresados y búsqueda.
--
-- Etapa 1 de 3 del plan CRM. Solo esquema — no toca UI ni el pipeline de
-- import histórico (Etapa 2).
--
-- Cada tabla nueva sigue el patrón de 000002_material_r2_and_course_access.sql:
-- el loop que aplica `staff_all_access` a "todas las tablas" corrió una sola
-- vez en 000000_init.sql, así que toda tabla nueva necesita su propio
-- ENABLE ROW LEVEL SECURITY + policy explícita.
--
-- Idempotente: seguro de correr más de una vez.
-- ─────────────────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------------------
-- 1. profiles — datos extendidos de la persona (1:1, dependen solo de
--    profiles.id → no viola 3FN).
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS dni                     TEXT,
    ADD COLUMN IF NOT EXISTS birth_date               DATE,
    ADD COLUMN IF NOT EXISTS gender                   TEXT,
    ADD COLUMN IF NOT EXISTS address_street           TEXT,
    ADD COLUMN IF NOT EXISTS address_city             TEXT,
    ADD COLUMN IF NOT EXISTS address_province         TEXT,
    ADD COLUMN IF NOT EXISTS address_country          TEXT DEFAULT 'Argentina',
    ADD COLUMN IF NOT EXISTS current_occupation       TEXT,
    ADD COLUMN IF NOT EXISTS referred_by_profile_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS referred_by_name         TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'profiles_dni_unique'
    ) THEN
        CREATE UNIQUE INDEX profiles_dni_unique ON public.profiles(dni) WHERE dni IS NOT NULL;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. profile_intake — respuestas de la entrevista de admisión. Tabla
--    separada (1:1 opcional) para no llenar `profiles` de columnas nulas.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_intake (
    profile_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    intention     TEXT,
    dream1        TEXT,
    dream2        TEXT,
    dream3        TEXT,
    qualities     TEXT,
    context       TEXT,
    energy_leaks  TEXT,
    life_history  TEXT,
    daily_routine TEXT,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ---------------------------------------------------------------------------
-- 3. Tags — segmentos libres (M:N).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tags (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label      TEXT NOT NULL UNIQUE,
    color      TEXT NOT NULL DEFAULT 'slate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profile_tags (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tag_id     UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    added_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    added_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    PRIMARY KEY (profile_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- 4. profile_notes — timeline CRM a nivel persona (cross-programa). Distinto
--    de enrollment_notes, que sigue siendo lo específico de una inscripción.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_notes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    body              TEXT NOT NULL,
    pinned            BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ---------------------------------------------------------------------------
-- 5. enrollments — seguimiento de egresados. Cuelga de la inscripción (no
--    de profiles) porque el resultado depende de QUÉ programa completó.
-- ---------------------------------------------------------------------------

ALTER TABLE public.enrollments
    ADD COLUMN IF NOT EXISTS outcome_status TEXT,
    ADD COLUMN IF NOT EXISTS outcome_notes  TEXT,
    ADD COLUMN IF NOT EXISTS testimonial    TEXT,
    ADD COLUMN IF NOT EXISTS follow_up_at   DATE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_outcome_status_check'
    ) THEN
        ALTER TABLE public.enrollments
            ADD CONSTRAINT enrollments_outcome_status_check
            CHECK (outcome_status IS NULL OR outcome_status IN
                ('employed', 'entrepreneur', 'studying', 'seeking', 'other'));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Búsqueda — pg_trgm + índice GIN sobre nombre/email/dni, para reemplazar
--    el filtro .includes() en memoria del panel de Personas.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'profiles_search_trgm_idx'
    ) THEN
        CREATE INDEX profiles_search_trgm_idx ON public.profiles
            USING GIN ((
                coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
                coalesce(email, '') || ' ' || coalesce(dni, '')
            ) gin_trgm_ops);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.profile_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_tags   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_notes  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_access ON public.profile_intake;
CREATE POLICY staff_all_access ON public.profile_intake
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_all_access ON public.tags;
CREATE POLICY staff_all_access ON public.tags
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_all_access ON public.profile_tags;
CREATE POLICY staff_all_access ON public.profile_tags
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_all_access ON public.profile_notes;
CREATE POLICY staff_all_access ON public.profile_notes
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Coaches: solo tags/notas de los alumnos que tienen asignados
-- (coach_oversees, mismo helper que usa staff_activity_events).
DROP POLICY IF EXISTS coach_scoped ON public.profile_tags;
CREATE POLICY coach_scoped ON public.profile_tags
    FOR ALL TO authenticated
    USING (public.is_coach() AND public.coach_oversees(profile_id))
    WITH CHECK (public.is_coach() AND public.coach_oversees(profile_id));

DROP POLICY IF EXISTS coach_scoped ON public.profile_notes;
CREATE POLICY coach_scoped ON public.profile_notes
    FOR ALL TO authenticated
    USING (public.is_coach() AND public.coach_oversees(profile_id))
    WITH CHECK (public.is_coach() AND public.coach_oversees(profile_id));

-- Coaches necesitan leer el catálogo de tags para poder asignarlos
-- (crear/editar tags queda solo para staff, vía staff_all_access).
DROP POLICY IF EXISTS coach_read ON public.tags;
CREATE POLICY coach_read ON public.tags
    FOR SELECT TO authenticated
    USING (public.is_coach());

-- ---------------------------------------------------------------------------
-- 8. Índices de soporte
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS profile_notes_profile_idx ON public.profile_notes(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profile_tags_tag_idx       ON public.profile_tags(tag_id);
