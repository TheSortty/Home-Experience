-- Migration: 000005_fix_coach_role_and_grants.sql
-- Description: Corrects two issues found after running 000004 in production:
--   1. The new tables (coach_assignments, staff_activity_events,
--      staff_activity_event_reads) were created AFTER the bulk
--      `GRANT ALL ON ALL TABLES TO authenticated`, so PostgREST got HTTP 403
--      "permission denied for table coach_assignments".
--   2. There's a CHECK constraint on `profiles.role` (added manually outside
--      the repo's migrations) that doesn't include 'coach', so promoting
--      anyone to coach fails with code 23514.
--
-- Both fixes are idempotent — safe to run again.

-- ── 1. GRANT access on new tables ─────────────────────────────────────────

GRANT ALL ON public.coach_assignments           TO authenticated;
GRANT ALL ON public.staff_activity_events       TO authenticated;
GRANT ALL ON public.staff_activity_event_reads  TO authenticated;

-- Make sure future tables in public are accessible by default too. This was
-- missing from the original setup, which is why every new table needs an
-- explicit GRANT.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO authenticated;

-- ── 2. Allow 'coach' on profiles.role ─────────────────────────────────────
-- The CHECK constraint exists in production but its definition isn't in the
-- repo. We drop it (if present) and recreate it including 'coach'.

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Drop ALL CHECK constraints on profiles that reference the role column.
    -- Production may have multiple (manual additions over time).
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
END $$;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'coach', 'admin', 'sysadmin', 'super_admin'));
