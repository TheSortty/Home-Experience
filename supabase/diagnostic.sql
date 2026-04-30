-- =============================================================================
-- DIAGNÓSTICO: Compara la DB real contra lo que define 000000_init.sql
-- Pega este archivo COMPLETO en Supabase → SQL Editor y ejecutá.
-- Cada query devuelve un set independiente; revisá los resultados de a uno.
-- =============================================================================

-- ── 1. TABLAS EXISTENTES ─────────────────────────────────────────────────────
-- Esperadas: profiles, packages, courses, cycles, enrollments, enrollment_notes,
-- cycle_sessions, attendance, student_goals, weekly_checkins, goals,
-- notifications, medical_info, testimonials, site_settings, forms,
-- form_submissions, payments, activity_logs, registrations, modules, lessons,
-- lesson_resources, lesson_progress, forum_posts.
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ── 2. COLUMNAS DE form_submissions (debe tener email + is_deleted) ──────────
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'form_submissions'
 ORDER BY ordinal_position;

-- ── 3. COLUMNAS DE profiles (debe tener bio, instagram, is_deleted) ──────────
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'profiles'
 ORDER BY ordinal_position;

-- ── 4. COLUMNAS DE cycles (debe tener course_id, is_linear, is_deleted) ──────
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'cycles'
 ORDER BY ordinal_position;

-- ── 5. POLÍTICAS RLS (deben existir staff_all_access en TODAS las tablas) ────
SELECT tablename, COUNT(*) AS num_policies, BOOL_OR(policyname = 'staff_all_access') AS has_staff_all
  FROM pg_policies
 WHERE schemaname = 'public'
 GROUP BY tablename
 ORDER BY tablename;

-- ── 6. FUNCIONES Y RPCs ──────────────────────────────────────────────────────
-- Esperadas: is_staff, get_my_profile_id, handle_new_user,
-- prevent_profile_privilege_escalation, increment_enrolled_count,
-- confirm_submission_enrollment, handle_linear_attendance.
SELECT proname AS function_name, pg_get_function_result(oid) AS returns
  FROM pg_proc
 WHERE pronamespace = 'public'::regnamespace
   AND proname IN (
     'is_staff', 'get_my_profile_id', 'handle_new_user',
     'prevent_profile_privilege_escalation', 'increment_enrolled_count',
     'confirm_submission_enrollment', 'handle_linear_attendance'
   )
 ORDER BY proname;

-- ── 7. TRIGGERS (debe haber on_auth_user_created y trg_prevent_profile_escalation)
SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation
  FROM information_schema.triggers
 WHERE trigger_schema IN ('public', 'auth')
 ORDER BY event_object_table, trigger_name;

-- ── 8. ÍNDICES CRÍTICOS ──────────────────────────────────────────────────────
SELECT tablename, indexname
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND indexname IN (
     'idx_profiles_user_id', 'idx_enrollments_user_id', 'idx_enrollments_cycle_id',
     'idx_form_submissions_email', 'attendance_enrollment_session_unique',
     'idx_lesson_progress_user_id', 'idx_forum_posts_user_id'
   )
 ORDER BY tablename, indexname;

-- ── 9. INTEGRIDAD: form_submissions con email NULL pero data->>'email' presente
-- Después de aplicar el init más reciente esto debería volver 0.
SELECT COUNT(*) AS submissions_with_null_email_column
  FROM public.form_submissions
 WHERE email IS NULL
   AND data ? 'email'
   AND TRIM(data->>'email') <> '';

-- ── 10. INTEGRIDAD: perfiles con user_id NULL (no enlazados a auth.users) ────
SELECT COUNT(*) AS profiles_without_auth, role
  FROM public.profiles
 WHERE user_id IS NULL
 GROUP BY role;

-- ── 11. INTEGRIDAD: enrollments huérfanos ────────────────────────────────────
SELECT COUNT(*) AS orphan_enrollments
  FROM public.enrollments e
  LEFT JOIN public.profiles p ON p.id = e.user_id
 WHERE p.id IS NULL;

-- ── 12. CONTEO RÁPIDO de filas en tablas críticas ────────────────────────────
SELECT 'profiles'         AS tabla, COUNT(*) FROM public.profiles
UNION ALL SELECT 'cycles',          COUNT(*) FROM public.cycles
UNION ALL SELECT 'enrollments',     COUNT(*) FROM public.enrollments
UNION ALL SELECT 'courses',         COUNT(*) FROM public.courses
UNION ALL SELECT 'modules',         COUNT(*) FROM public.modules
UNION ALL SELECT 'lessons',         COUNT(*) FROM public.lessons
UNION ALL SELECT 'lesson_progress', COUNT(*) FROM public.lesson_progress
UNION ALL SELECT 'forum_posts',     COUNT(*) FROM public.forum_posts
UNION ALL SELECT 'form_submissions',COUNT(*) FROM public.form_submissions
UNION ALL SELECT 'attendance',      COUNT(*) FROM public.attendance
UNION ALL SELECT 'cycle_sessions',  COUNT(*) FROM public.cycle_sessions
UNION ALL SELECT 'site_settings',   COUNT(*) FROM public.site_settings
UNION ALL SELECT 'forms',           COUNT(*) FROM public.forms
ORDER BY tabla;

-- ── 13. RPC test: confirmar que retorna user_id (alias de profile_id) ────────
-- NO ejecutar como real — solo verificar la firma:
SELECT pg_get_function_arguments(oid) AS args, pg_get_function_result(oid) AS returns
  FROM pg_proc
 WHERE proname = 'confirm_submission_enrollment';

-- ── 14. REALTIME: tablas en la publicación ───────────────────────────────────
-- Esperadas: form_submissions, profiles, enrollments, cycles, attendance, cycle_sessions
SELECT tablename
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
   AND schemaname = 'public'
 ORDER BY tablename;
