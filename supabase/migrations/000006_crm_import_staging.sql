-- ─────────────────────────────────────────────────────────────────────────────
-- 000006 — Staging para el importador histórico del CRM (Etapa 2 de 3).
--
-- Ninguna fila de un CSV toca profiles/enrollments directamente. Todo entra
-- primero acá como JSONB crudo; recién se vuelca a las tablas finales cuando
-- el staff confirma la resolución de duplicados (ver plan CRM, Etapa 2).
--
-- Solo staff importa — RLS sigue el patrón de 000002/000005
-- (staff_all_access explícito, porque el loop que lo aplica a "todas las
-- tablas" corrió una sola vez en 000000_init.sql).
--
-- Idempotente: seguro de correr más de una vez.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.import_batches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_label    TEXT NOT NULL,          -- ej. "Excel CRESER 2022"
    created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Mapeo elegido (columna del CSV → campo destino), para poder reaplicarlo
    -- a otro archivo con el mismo formato sin repetir el paso de mapeo.
    column_mapping  JSONB NOT NULL DEFAULT '{}'::jsonb,
    status          TEXT NOT NULL DEFAULT 'staged',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', nwow()) NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'import_batches_status_check'
    ) THEN
        ALTER TABLE public.import_batches
            ADD CONSTRAINT import_batches_status_check
            CHECK (status IN ('staged', 'resolving', 'applied', 'discarded'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.import_staging_rows (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id           UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
    row_number         INTEGER NOT NULL,
    raw                JSONB NOT NULL,        -- fila cruda tal cual vino del CSV (post-mapeo de columnas)
    matched_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status             TEXT NOT NULL DEFAULT 'pending',
    error_message      TEXT,
    UNIQUE (batch_id, row_number)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'import_staging_rows_status_check'
    ) THEN
        ALTER TABLE public.import_staging_rows
            ADD CONSTRAINT import_staging_rows_status_check
            CHECK (status IN ('pending', 'matched', 'created', 'skipped', 'error', 'applied'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS import_staging_rows_batch_idx ON public.import_staging_rows(batch_id);

ALTER TABLE public.import_batches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_staging_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_access ON public.import_batches;
CREATE POLICY staff_all_access ON public.import_batches
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_all_access ON public.import_staging_rows;
CREATE POLICY staff_all_access ON public.import_staging_rows
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());
