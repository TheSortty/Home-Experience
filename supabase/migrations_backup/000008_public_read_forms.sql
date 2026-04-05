-- Migration: 000008_public_read_forms
-- Description: Allows anyone (anonymous or authenticated) to read the form schemas.

-- 1. Explicitly allow public reading of form schemas
DROP POLICY IF EXISTS public_read_forms ON public.forms;
CREATE POLICY public_read_forms ON public.forms
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- 2. Also ensure cycles (for calendar) are readable by public
DROP POLICY IF EXISTS public_read_cycles ON public.cycles;
CREATE POLICY public_read_cycles ON public.cycles
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- 3. Ensure enrollments and profiles remain strictly protected (already covered by 000007 staff_all_access)
