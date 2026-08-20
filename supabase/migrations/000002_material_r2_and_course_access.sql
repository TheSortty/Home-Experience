-- ─────────────────────────────────────────────────────────────────────────────
-- 000002 — Material descargable en R2 + acceso por curso ("vidriera")
--
-- 1. lesson_resources guarda archivos subidos a Cloudflare R2 (no sólo links):
--    storage_key / file_name / content_type / size_bytes / uploaded_by.
--    Los links externos siguen funcionando igual (storage_key IS NULL).
--
-- 2. Acceso por curso. Hasta ahora CUALQUIER usuario autenticado veía todos los
--    módulos, clases, materiales y posts del foro de todos los cursos
--    publicados. Ahora el contenido queda restringido a quien tiene el curso
--    asignado; el curso en sí sigue siendo visible (vidriera) para que el
--    alumno vea que existe y aparezca bloqueado.
--
--    El acceso al LMS es ASIGNACIÓN DIRECTA: una fila en course_access por
--    (alumno, curso), que carga el organizador desde el panel del curso. NO se
--    deriva de las inscripciones a ciclos: los cursos del campus son contenido
--    propio del LMS y no espejan los programas de CRESER.
--
--    Staff y coaches ven todo el catálogo sin necesidad de asignación.
--
--    ⚠️ AL APLICAR: la tabla arranca VACÍA, así que ningún alumno ve contenido
--    hasta que se le asigne el curso. Dos formas de arrancar:
--
--    a) Desde el admin, curso por curso: Programas → curso → pestaña "Accesos"
--       (o desde la ficha del alumno → Progreso).
--
--    b) Preservando lo que ya estaba abierto — todos los alumnos a todos los
--       cursos publicados — y después sacando lo que no corresponda:
--
--        INSERT INTO public.course_access (profile_id, course_id)
--        SELECT p.id, c.id
--        FROM public.profiles p
--        CROSS JOIN public.courses c
--        WHERE p.role = 'student' AND c.is_published = true
--        ON CONFLICT DO NOTHING;
--
-- Idempotente: seguro de ejecutar más de una vez.
-- ─────────────────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------------------
-- 1. lesson_resources: archivos en R2
-- ---------------------------------------------------------------------------

ALTER TABLE public.lesson_resources
    ADD COLUMN IF NOT EXISTS storage_key  TEXT,
    ADD COLUMN IF NOT EXISTS file_name    TEXT,
    ADD COLUMN IF NOT EXISTS content_type TEXT,
    ADD COLUMN IF NOT EXISTS size_bytes   BIGINT,
    ADD COLUMN IF NOT EXISTS uploaded_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- La ruta /api/materiales/download resuelve el archivo por su clave de R2.
CREATE INDEX IF NOT EXISTS lesson_resources_storage_key_idx
    ON public.lesson_resources(storage_key)
    WHERE storage_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. course_access: qué cursos del LMS ve cada persona
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.course_access (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id  UUID NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (profile_id, course_id)
);

CREATE INDEX IF NOT EXISTS course_access_profile_idx ON public.course_access(profile_id);
CREATE INDEX IF NOT EXISTS course_access_course_idx  ON public.course_access(course_id);

-- El loop de RLS del init ya corrió: esta tabla es nueva y necesita su propia
-- habilitación + la política base de staff.
ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_access ON public.course_access;
CREATE POLICY staff_all_access
    ON public.course_access FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Cada persona puede ver sus propias asignaciones (para saber qué tiene).
DROP POLICY IF EXISTS "Students can view own course access" ON public.course_access;
CREATE POLICY "Students can view own course access"
    ON public.course_access FOR SELECT TO authenticated
    USING (profile_id = public.get_my_profile_id());

-- Los coaches necesitan leer las asignaciones para saber quién cursa qué.
DROP POLICY IF EXISTS "Coaches can view course access" ON public.course_access;
CREATE POLICY "Coaches can view course access"
    ON public.course_access FOR SELECT TO authenticated
    USING (public.is_coach());

-- ---------------------------------------------------------------------------
-- 3. Helpers de acceso
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS modules_course_id_idx ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS lessons_module_id_idx ON public.lessons(module_id);

-- has_course_access(course): ¿el usuario actual puede ver el contenido del curso?
CREATE OR REPLACE FUNCTION public.has_course_access(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF p_course_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Staff y coaches trabajan sobre todo el catálogo (dictan y corrigen).
    IF public.is_staff_or_coach() THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.course_access ca
        WHERE ca.profile_id = public.get_my_profile_id()
          AND ca.course_id = p_course_id
    );
END;
$$;

-- my_course_ids(): los cursos con acceso, para listados (evita N chequeos).
CREATE OR REPLACE FUNCTION public.my_course_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF public.is_staff_or_coach() THEN
        RETURN QUERY SELECT id FROM public.courses;
        RETURN;
    END IF;

    RETURN QUERY
        SELECT ca.course_id
        FROM public.course_access ca
        WHERE ca.profile_id = public.get_my_profile_id();
END;
$$;

-- course_id_of_lesson() / course_id_of_module(): resuelven clase o módulo →
-- curso. Van como SECURITY DEFINER para que la política no dispare el RLS de
-- las tablas intermedias (evita subconsultas anidadas caras en cada fila).
CREATE OR REPLACE FUNCTION public.course_id_of_lesson(p_lesson_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT m.course_id
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = p_lesson_id;
$$;

CREATE OR REPLACE FUNCTION public.course_id_of_module(p_module_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT course_id FROM public.modules WHERE id = p_module_id;
$$;

GRANT EXECUTE ON FUNCTION public.has_course_access(UUID)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_course_ids()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.course_id_of_lesson(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.course_id_of_module(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS: contenido del LMS restringido al curso asignado
-- ---------------------------------------------------------------------------

-- courses NO se restringe: la vidriera necesita mostrar los cursos publicados
-- (título, descripción, portada) aunque el alumno no tenga acceso.

DROP POLICY IF EXISTS "Users can view published modules" ON public.modules;
CREATE POLICY "Users can view published modules"
    ON public.modules FOR SELECT TO authenticated
    USING (is_published = true AND public.has_course_access(course_id));

DROP POLICY IF EXISTS "Users can view published lessons" ON public.lessons;
CREATE POLICY "Users can view published lessons"
    ON public.lessons FOR SELECT TO authenticated
    USING (
        is_published = true
        AND public.has_course_access(public.course_id_of_module(module_id))
    );

DROP POLICY IF EXISTS "lesson_videos_select" ON public.lesson_videos;
CREATE POLICY "lesson_videos_select"
    ON public.lesson_videos FOR SELECT TO authenticated
    USING (public.has_course_access(public.course_id_of_lesson(lesson_id)));

DROP POLICY IF EXISTS "Users can view lesson resources" ON public.lesson_resources;
CREATE POLICY "Users can view lesson resources"
    ON public.lesson_resources FOR SELECT TO authenticated
    USING (public.has_course_access(public.course_id_of_lesson(lesson_id)));

-- ---------------------------------------------------------------------------
-- 5. RLS: foro sólo entre quienes comparten el curso
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Students can view forum posts"       ON public.forum_posts;
DROP POLICY IF EXISTS "Students can insert own forum posts" ON public.forum_posts;

CREATE POLICY "Students can view forum posts"
    ON public.forum_posts FOR SELECT TO authenticated
    USING (public.has_course_access(course_id));

CREATE POLICY "Students can insert own forum posts"
    ON public.forum_posts FOR INSERT TO authenticated
    WITH CHECK (
        user_id = public.get_my_profile_id()
        AND public.has_course_access(course_id)
    );

-- ---------------------------------------------------------------------------
-- 6. RLS: no se puede entregar en un curso al que no se tiene acceso
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
CREATE POLICY "Students can insert own submissions"
    ON public.submissions FOR INSERT TO authenticated
    WITH CHECK (
        user_id = public.get_my_profile_id()
        AND public.has_course_access(public.course_id_of_lesson(lesson_id))
    );
