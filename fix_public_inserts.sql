-- Este script arregla el problema de "violates row-level security policy" al enviar formularios e historias (testimonios).
-- Permite que cualquier usuario (anónimo o autenticado) pueda insertar un nuevo registro en ambas tablas.

-- 1. Permiso para enviar inscripciones (form_submissions)
DROP POLICY IF EXISTS public_insert_forms ON public.form_submissions;
CREATE POLICY public_insert_forms ON public.form_submissions
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Permiso para enviar testimonios e historias (testimonials)
DROP POLICY IF EXISTS public_insert_testimonials ON public.testimonials;
CREATE POLICY public_insert_testimonials ON public.testimonials
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);
