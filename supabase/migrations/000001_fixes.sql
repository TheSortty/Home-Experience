-- Migration: 000001_fixes
-- Description: Bug fixes for admin panel - enrolled_count for combo second cycle + data migration for payment methods.
-- Created At: 2026-04-12

-- 1. RPC para incrementar enrolled_count de un ciclo de forma segura
--    Usado por el frontend al confirmar el segundo enrollment de un COMBO.
CREATE OR REPLACE FUNCTION public.increment_enrolled_count(p_cycle_id UUID)
RETURNS VOID
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE cycles SET enrolled_count = enrolled_count + 1 WHERE id = p_cycle_id;
END;
$$;

-- 2. Corregir datos históricos: normalizar "mercado_pago" → "mercadopago" en tabla payments
--    El frontend guardaba con guión bajas, pero la lectura busca sin guión.
UPDATE public.payments
SET method = 'mercadopago'
WHERE method = 'mercado_pago';

-- 3. Asegurar que el RPC confirm_submission_enrollment también use el formato correcto
--    (Ya está corregido en el frontend, pero dejamos el RPC agnóstico al método)

-- 4. Agregar start_date al select de enrollments en caso de que falte el índice
CREATE INDEX IF NOT EXISTS idx_cycles_start_date ON public.cycles(start_date);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_cycle_id ON public.enrollments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_id ON public.attendance(enrollment_id);
