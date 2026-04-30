-- =============================================================================
-- DIAGNÓSTICO simple — corré CADA query por separado.
-- Seleccioná solo el bloque que querés ejecutar y dale Run.
-- =============================================================================


-- ─── 1. Tablas presentes ───────────────────────────────────────────────────
SELECT tablename
  FROM pg_tables
 WHERE schemaname = 'public'
 ORDER BY tablename;


-- ─── 2. Columnas críticas en form_submissions (debe haber email + is_deleted)
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'form_submissions'
 ORDER BY ordinal_position;


-- ─── 3. Columnas críticas en profiles (debe haber bio, instagram, is_deleted)
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'profiles'
 ORDER BY ordinal_position;


-- ─── 4. Funciones / RPCs presentes ─────────────────────────────────────────
-- Esperadas: is_staff, get_my_profile_id, handle_new_user,
-- prevent_profile_privilege_escalation, increment_enrolled_count,
-- confirm_submission_enrollment, handle_linear_attendance.
SELECT proname AS function_name
  FROM pg_proc
 WHERE pronamespace = 'public'::regnamespace
   AND prokind = 'f'
 ORDER BY proname;


-- ─── 5. Triggers presentes ─────────────────────────────────────────────────
SELECT event_object_schema || '.' || event_object_table AS tabla, trigger_name
  FROM information_schema.triggers
 WHERE trigger_schema IN ('public', 'auth')
 ORDER BY tabla, trigger_name;


-- ─── 6. Tablas con política staff_all_access ───────────────────────────────
SELECT tablename
  FROM pg_policies
 WHERE schemaname = 'public' AND policyname = 'staff_all_access'
 ORDER BY tablename;


-- ─── 7. Índices críticos ───────────────────────────────────────────────────
SELECT tablename, indexname
  FROM pg_indexes
 WHERE schemaname = 'public'
 ORDER BY tablename, indexname;


-- ─── 8. form_submissions con email NULL pero data->>email lleno ─────────────
-- Si esto retorna > 0 filas, falta correr el backfill del init.sql
SELECT COUNT(*) AS submissions_email_column_null
  FROM public.form_submissions
 WHERE email IS NULL
   AND data ? 'email'
   AND TRIM(data->>'email') <> '';


-- ─── 9. Perfiles sin auth (user_id NULL) ───────────────────────────────────
-- Los admins deben tener user_id seteado para que is_staff() funcione
SELECT id, email, role, created_at
  FROM public.profiles
 WHERE user_id IS NULL
 ORDER BY role, created_at DESC;


-- ─── 10. Enrollments huérfanos (profile borrado) ───────────────────────────
SELECT COUNT(*) AS orphan_enrollments
  FROM public.enrollments e
  LEFT JOIN public.profiles p ON p.id = e.user_id
 WHERE p.id IS NULL;


-- ─── 11. Realtime: tablas en la publicación ────────────────────────────────
SELECT tablename
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
 ORDER BY tablename;


-- ─── 12. Conteos rápidos ───────────────────────────────────────────────────
-- Si una tabla no existe esto da error → corré la query 1 primero.
SELECT
  (SELECT COUNT(*) FROM public.profiles)         AS profiles,
  (SELECT COUNT(*) FROM public.cycles)           AS cycles,
  (SELECT COUNT(*) FROM public.enrollments)      AS enrollments,
  (SELECT COUNT(*) FROM public.courses)          AS courses,
  (SELECT COUNT(*) FROM public.modules)          AS modules,
  (SELECT COUNT(*) FROM public.lessons)          AS lessons,
  (SELECT COUNT(*) FROM public.lesson_progress)  AS lesson_progress,
  (SELECT COUNT(*) FROM public.forum_posts)      AS forum_posts,
  (SELECT COUNT(*) FROM public.form_submissions) AS form_submissions,
  (SELECT COUNT(*) FROM public.attendance)       AS attendance,
  (SELECT COUNT(*) FROM public.site_settings)    AS site_settings;


-- ─── 13. Firma del RPC confirm_submission_enrollment ───────────────────────
-- Debe retornar JSONB y tener 4 parámetros
SELECT proname,
       pg_get_function_arguments(oid) AS args,
       pg_get_function_result(oid)    AS returns
  FROM pg_proc
 WHERE proname = 'confirm_submission_enrollment';
