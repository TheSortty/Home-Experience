-- Este script arregla el problema de "violates row-level security policy" al enviar formularios.
-- Permite que cualquier usuario (anónimo o autenticado) pueda insertar una nueva respuesta en la tabla form_submissions.

DROP POLICY IF EXISTS public_insert_forms ON public.form_submissions;
CREATE POLICY public_insert_forms ON public.form_submissions
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);
