-- EXCEPTION C: The application needs to read the form schema to render the registration page.
DROP POLICY IF EXISTS public_read_forms ON public.forms;
CREATE POLICY public_read_forms ON public.forms
  FOR SELECT 
  TO anon, authenticated
  USING (is_deleted = false);
