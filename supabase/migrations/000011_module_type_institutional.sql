-- Extend module_type to support 'institutional' — modules that hold institutional
-- documents (rules, contracts, certification criteria) instead of LMS content.
-- These are surfaced via a dedicated "Archivos institucionales" tab and are
-- excluded from the regular Módulos list, progress tracking, and "next lesson"
-- navigation.
--
-- This replaces the prior workaround of creating a regular "Módulo 0 - ARCHIVOS
-- INSTITUCIONALES" container.

ALTER TABLE modules
  DROP CONSTRAINT IF EXISTS modules_module_type_check;

ALTER TABLE modules
  ADD CONSTRAINT modules_module_type_check
    CHECK (module_type IN ('module', 'workshop', 'institutional'));

-- Heuristic back-fill: any module currently named like the workaround gets
-- promoted to institutional. Safe re-run.
UPDATE modules
SET module_type = 'institutional'
WHERE lower(title) LIKE '%archivos institucionales%'
   OR lower(title) LIKE '%archivos institucional%';

-- PostgREST schema cache reload so the new value is recognized immediately.
NOTIFY pgrst, 'reload schema';
