-- ─────────────────────────────────────────────────────────────────────────────
-- 000001 — Sección CAMPO + fecha/hora límite exacta de entregas
--
-- 1. modules.module_type acepta 'campo': contenedor de prácticas de talleres
--    donde el alumno sube su bitácora (usa el flujo de entregas existente).
-- 2. lessons.due_at: fecha y hora límite EXACTA de la entrega, cargada por el
--    admin. Tiene prioridad sobre el cálculo "unlocked_at + due_days".
--
-- Idempotente: seguro de ejecutar más de una vez.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_module_type_check;
ALTER TABLE public.modules ADD CONSTRAINT modules_module_type_check
    CHECK (module_type IN ('module', 'workshop', 'institutional', 'campo'));

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS due_at TIMESTAMP WITH TIME ZONE;
