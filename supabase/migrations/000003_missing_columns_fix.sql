-- Migration: 000003_missing_columns_fix
-- Description: Adds columns that the frontend already uses but were missing from the initial schema.
--              This was the root cause of silent query failures throughout the admin dashboard
--              and the public registration form.
-- Created At: 2026-04-21

-- Created At: 2026-04-21

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FORM_SUBMISSIONS: Add soft-delete + is_deleted columns
--    These are referenced in AdminAdmissions.tsx (.eq('is_deleted', false))
--    and in the AdminDashboard overview queries.
--    Without these columns, every filtered query silently fails or returns 0 rows.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.form_submissions
    ADD COLUMN IF NOT EXISTS is_deleted   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS deleted_by   UUID;

-- Ensure existing rows are explicitly marked as NOT deleted
UPDATE public.form_submissions SET is_deleted = false WHERE is_deleted IS NULL;

-- Index for fast soft-delete filtering
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_deleted ON public.form_submissions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status     ON public.form_submissions(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROFILES: Add soft-delete columns
--    Used in AdminStudents.tsx (.eq('is_deleted', false/true))
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS deleted_by  UUID;

UPDATE public.profiles SET is_deleted = false WHERE is_deleted IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON public.profiles(is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CYCLES: is_deleted was already added in 000002, but add a safety guard
--    in case the project DB was created before that migration ran.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.cycles
    ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS deleted_by  UUID,
    ADD COLUMN IF NOT EXISTS is_linear   BOOLEAN NOT NULL DEFAULT false;

UPDATE public.cycles SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE public.cycles SET is_linear  = true  WHERE type IN ('initial', 'advanced') AND is_linear IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. REALTIME: Enable for all tables used by the admin dashboard
--    Supabase Realtime requires tables to be in the publication.
--    Run idempotently so it's safe to apply multiple times.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.form_submissions;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cycles;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cycle_sessions;
    EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS: Ensure public_read_forms uses the correct is_deleted check
--    If is_deleted was NULL for some rows, the old USING (is_deleted = false)
--    policy would return zero rows because NULL = false → NULL (falsy).
--    Fix: use USING (is_deleted IS NOT TRUE) which correctly treats NULL as "not deleted".
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS public_read_forms ON public.forms;
CREATE POLICY public_read_forms ON public.forms
    FOR SELECT TO anon, authenticated
    USING (is_deleted IS NOT TRUE);
