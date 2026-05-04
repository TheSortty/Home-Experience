-- =============================================================================
-- Fix: Admin Dashboard infinite loading
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- ── 1. RPC: get_user_role() ──────────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS, solving the chicken-and-egg problem where
-- resolveRole() needs to read profiles but RLS calls is_staff() which also
-- reads profiles. This function is safe: it only returns the role string
-- for the currently authenticated user (auth.uid()).

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT COALESCE(role, 'student')
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;


-- ── 2. Fix specific account: set admin role ──────────────────────────────────
-- The account m.emiliagnattero@gmail.com was invited via Supabase Dashboard,
-- which created the profile with role='student' by default.
-- Change it to 'admin' so she can access the admin dashboard.

UPDATE public.profiles
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'm.emiliagnattero@gmail.com'
  AND role != 'admin';

-- Verify the fix:
SELECT id, user_id, email, role, created_at
FROM public.profiles
WHERE email = 'm.emiliagnattero@gmail.com';
