-- Migration: 000003_course_sessions.sql
-- Description: Encuentros (reuniones/fechas) ligados directamente a un curso,
--   independientes de los ciclos operativos. Aparecen en el calendario de
--   cualquier alumno con acceso al curso.

CREATE TABLE IF NOT EXISTS public.course_sessions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id     UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    session_date  DATE NOT NULL,
    session_time  TIME,
    label         TEXT,
    description   TEXT,
    location_url  TEXT,
    is_mandatory  BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    created_by    UUID
);

CREATE INDEX IF NOT EXISTS course_sessions_course_id_idx
    ON public.course_sessions (course_id);
CREATE INDEX IF NOT EXISTS course_sessions_session_date_idx
    ON public.course_sessions (session_date);

ALTER TABLE public.course_sessions ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede VER encuentros de cursos publicados.
-- (Match con la política actual de courses que permite ver cursos publicados a todos.)
DROP POLICY IF EXISTS "Authenticated can view course sessions" ON public.course_sessions;
CREATE POLICY "Authenticated can view course sessions"
    ON public.course_sessions FOR SELECT TO authenticated
    USING (
        course_id IN (
            SELECT id FROM public.courses
            WHERE is_published = true OR public.is_staff()
        )
    );

-- Solo staff (admin/sysadmin) puede crear/modificar/eliminar encuentros.
DROP POLICY IF EXISTS "Staff can manage course sessions" ON public.course_sessions;
CREATE POLICY "Staff can manage course sessions"
    ON public.course_sessions FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- Permitir realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'course_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_sessions;
  END IF;
END $$;
