-- ─────────────────────────────────────────────────────────────────────────────
-- Dar acceso de administrador a benincanicolas@icloud.com SIN dejar de ser
-- alumno de la formación.
--
-- Cómo funciona (ver packages/services/src/courseAccess.ts → resolveCampusRole):
--   · profiles.role pasa a 'admin'  → entra a la administración (siendohome.com/admin).
--   · en el campus se lo trata como ALUMNO mientras tenga al menos un curso
--     asignado en course_access: ve sólo su curso, se le guarda el progreso y
--     no aparecen los controles de staff.
--   · en Personas → Alumnos sigue apareciendo mientras tenga inscripciones.
--
-- Se corre a mano en Supabase → SQL Editor. Es un cambio de DATOS, no de schema,
-- por eso no está en supabase/migrations.
--
-- Por qué se desactiva el trigger: `prevent_profile_privilege_escalation` sólo
-- deja cambiar el rol si is_staff() es true, y desde el SQL Editor no hay un
-- usuario autenticado (auth.uid() es NULL), así que el UPDATE fallaría.
-- Todo va en una transacción para que el trigger nunca quede desactivado.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) PREFLIGHT — correr primero, sola, y mirar el resultado ────────────────
-- Tiene que devolver UNA fila, con role = 'student' y cursos_asignados >= 1.
-- Si cursos_asignados es 0, asignale el curso en Programas → curso → Accesos
-- ANTES de seguir: sin eso el campus lo trataría como admin, no como alumno.
SELECT p.id,
       p.email,
       p.role,
       p.is_deleted,
       (SELECT count(*) FROM public.course_access ca WHERE ca.profile_id = p.id) AS cursos_asignados,
       (SELECT count(*) FROM public.enrollments   e  WHERE e.user_id     = p.id) AS inscripciones
FROM public.profiles p
WHERE lower(p.email) = lower('benincanicolas@icloud.com');

-- ── 2) CAMBIO DE ROL — correr como bloque ────────────────────────────────────
BEGIN;

ALTER TABLE public.profiles DISABLE TRIGGER trg_prevent_profile_escalation;

UPDATE public.profiles
   SET role = 'admin'
 WHERE lower(email) = lower('benincanicolas@icloud.com')
   AND role = 'student';          -- no pisa nada si ya cambió

ALTER TABLE public.profiles ENABLE TRIGGER trg_prevent_profile_escalation;

COMMIT;

-- ── 3) VERIFICACIÓN ──────────────────────────────────────────────────────────
-- role = 'admin'. Y el trigger tiene que seguir activo: tgenabled = 'O'.
SELECT p.email, p.role
FROM public.profiles p
WHERE lower(p.email) = lower('benincanicolas@icloud.com');

SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_prevent_profile_escalation';

-- ── REVERTIR (si hiciera falta) ──────────────────────────────────────────────
-- BEGIN;
-- ALTER TABLE public.profiles DISABLE TRIGGER trg_prevent_profile_escalation;
-- UPDATE public.profiles SET role = 'student'
--  WHERE lower(email) = lower('benincanicolas@icloud.com');
-- ALTER TABLE public.profiles ENABLE TRIGGER trg_prevent_profile_escalation;
-- COMMIT;
