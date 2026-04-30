-- =============================================================================
-- DIAGNÓSTICO consolidado en UNA sola query.
-- Pegá esto en Supabase → SQL Editor y dale Run (NO EXPLAIN).
-- Devuelve un solo resultado con check / status / detail.
-- =============================================================================

WITH expected_tables(name) AS (
  VALUES
    ('profiles'), ('packages'), ('courses'), ('cycles'), ('enrollments'),
    ('enrollment_notes'), ('cycle_sessions'), ('attendance'), ('student_goals'),
    ('weekly_checkins'), ('goals'), ('notifications'), ('medical_info'),
    ('testimonials'), ('site_settings'), ('forms'), ('form_submissions'),
    ('payments'), ('activity_logs'), ('registrations'), ('modules'),
    ('lessons'), ('lesson_resources'), ('lesson_progress'), ('forum_posts')
),
expected_funcs(name) AS (
  VALUES
    ('is_staff'), ('get_my_profile_id'), ('handle_new_user'),
    ('prevent_profile_privilege_escalation'), ('increment_enrolled_count'),
    ('confirm_submission_enrollment'), ('handle_linear_attendance')
),
expected_cols(table_name, col) AS (
  VALUES
    ('profiles', 'bio'), ('profiles', 'instagram'), ('profiles', 'is_deleted'),
    ('cycles', 'course_id'), ('cycles', 'is_linear'), ('cycles', 'is_deleted'),
    ('form_submissions', 'email'), ('form_submissions', 'is_deleted'),
    ('forum_posts', 'lesson_id')
)

SELECT '1. TABLAS FALTANTES' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ FALTAN ' || COUNT(*)::text END AS status,
       COALESCE(STRING_AGG(name, ', '), 'todas presentes') AS detail
  FROM expected_tables
 WHERE name NOT IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')

UNION ALL SELECT '2. FUNCIONES FALTANTES',
       CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ FALTAN ' || COUNT(*)::text END,
       COALESCE(STRING_AGG(name, ', '), 'todas presentes')
  FROM expected_funcs
 WHERE name NOT IN (
   SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace
 )

UNION ALL SELECT '3. COLUMNAS FALTANTES',
       CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ FALTAN ' || COUNT(*)::text END,
       COALESCE(STRING_AGG(table_name || '.' || col, ', '), 'todas presentes')
  FROM expected_cols ec
 WHERE NOT EXISTS (
   SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ec.table_name AND column_name = ec.col
 )

UNION ALL SELECT '4. RLS sin staff_all_access',
       CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️  ' || COUNT(*)::text END,
       COALESCE(STRING_AGG(t.tablename, ', '), 'todas tienen staff_all_access')
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
       WHERE p.schemaname = 'public' AND p.tablename = t.tablename AND p.policyname = 'staff_all_access'
    )

UNION ALL SELECT '5. ÍNDICES CRÍTICOS faltantes',
       CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️  FALTAN ' || COUNT(*)::text END,
       COALESCE(STRING_AGG(idx_name, ', '), 'todos presentes')
  FROM (VALUES
    ('idx_profiles_user_id'), ('idx_enrollments_user_id'), ('idx_enrollments_cycle_id'),
    ('idx_form_submissions_email'), ('attendance_enrollment_session_unique'),
    ('idx_lesson_progress_user_id'), ('idx_forum_posts_user_id')
  ) AS x(idx_name)
 WHERE idx_name NOT IN (SELECT indexname FROM pg_indexes WHERE schemaname = 'public')

UNION ALL SELECT '6. TRIGGER on_auth_user_created',
       CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FALTA' END,
       'esperado en auth.users'
  FROM information_schema.triggers
 WHERE trigger_name = 'on_auth_user_created'

UNION ALL SELECT '7. TRIGGER trg_prevent_profile_escalation',
       CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FALTA' END,
       'esperado en public.profiles'
  FROM information_schema.triggers
 WHERE trigger_name = 'trg_prevent_profile_escalation'

UNION ALL SELECT '8. form_submissions con email NULL',
       CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️  ' || COUNT(*)::text || ' filas' END,
       'corré el init.sql nuevo para hacer backfill desde data->>email'
  FROM public.form_submissions
 WHERE email IS NULL AND data ? 'email' AND TRIM(data->>'email') <> ''

UNION ALL SELECT '9. Perfiles sin user_id (sin auth)',
       '⚠️  ' || COUNT(*)::text || ' filas',
       'admin debe tener user_id seteado para que is_staff() funcione'
  FROM public.profiles
 WHERE user_id IS NULL

UNION ALL SELECT '10. Enrollments huérfanos',
       CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ ' || COUNT(*)::text END,
       'enrollments cuyo profile fue borrado'
  FROM public.enrollments e
  LEFT JOIN public.profiles p ON p.id = e.user_id
 WHERE p.id IS NULL

UNION ALL SELECT '11. Realtime habilitado',
       COUNT(*)::text || ' tablas',
       COALESCE(STRING_AGG(tablename, ', '), 'ninguna')
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime' AND schemaname = 'public'

UNION ALL SELECT '12. Conteo total',
       'tablas: ' || COUNT(DISTINCT t.tablename)::text,
       'profiles=' || (SELECT COUNT(*) FROM public.profiles)::text ||
       ', cycles=' || (SELECT COUNT(*) FROM public.cycles)::text ||
       ', enrollments=' || (SELECT COUNT(*) FROM public.enrollments)::text ||
       ', courses=' || COALESCE((SELECT COUNT(*)::text FROM pg_tables WHERE schemaname='public' AND tablename='courses'), '0')
  FROM pg_tables t WHERE t.schemaname = 'public'

ORDER BY check_name;
