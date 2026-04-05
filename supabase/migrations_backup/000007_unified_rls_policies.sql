-- Migration: 000007_unified_rls_policies
-- Description: Unifies database security by applying strict RLS to ensure only staff can access data.

-- Fix for "Function Search Path Mutable" warning on existing confirm_submission_enrollment
ALTER FUNCTION public.confirm_submission_enrollment SET search_path = public;

-- 1. Create a helper function to check if the current user is an admin or sysadmin.
-- SECURITY DEFINER allows this function to bypass RLS to read the profiles table without infinite recursion.
-- SET search_path = public fixes the "Function Search Path Mutable" warning.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'sysadmin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean up ALL existing policies dynamically to eliminate the "RLS Policy Always True" warnings
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- We query the internal Postgres table of policies to find EVERY policy that exists
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND policyname NOT IN ('staff_all_access', 'public_insert_forms', 'public_read_testimonials')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 3. Apply the new secure policy to all public tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    -- Drop our own policy in case we are re-running this script
    EXECUTE format('DROP POLICY IF EXISTS staff_all_access ON public.%I', r.tablename);

    -- Ensure RLS is strictly enabled
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);

    -- Create the new, unified staff-only policy
    EXECUTE format('CREATE POLICY staff_all_access ON public.%I FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())', r.tablename);
  END LOOP;
END $$;

-- 4. Specific RLS Exceptions for Public Workflows

-- EXCEPTION A: The Landing Page needs to be able to INSERT form submissions anonymously or as authenticated students.
DROP POLICY IF EXISTS public_insert_forms ON public.form_submissions;
CREATE POLICY public_insert_forms ON public.form_submissions
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- EXCEPTION B: Testimonials are read by the Landing Page, so they need to be public for reading.
DROP POLICY IF EXISTS public_read_testimonials ON public.testimonials;
CREATE POLICY public_read_testimonials ON public.testimonials
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- 5. Re-grant general API access
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
