-- ─────────────────────────────────────────────────────────────────────────────
-- 000008 — Quitar enrollments.enrolled_by_profile_id (agregada en 000007).
--
-- Era una segunda FK de enrollments → profiles (además de user_id). Con dos,
-- PostgREST ya no sabe qué relación usar cuando se pide "perfil con sus
-- inscripciones" sin aclararla, y esas consultas fallan (PGRST201). El
-- enrolador se guarda como texto en enrolled_by_name, que alcanza.
--
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS public.enrollments_enrolled_by_profile_idx;
ALTER TABLE public.enrollments DROP COLUMN IF EXISTS enrolled_by_profile_id;

-- Que PostgREST relea el esquema ya mismo.
NOTIFY pgrst, 'reload schema';
