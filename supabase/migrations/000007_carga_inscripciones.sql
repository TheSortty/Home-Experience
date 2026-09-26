-- ─────────────────────────────────────────────────────────────────────────────
-- 000007 — Lo que faltaba para pasar los Excel de inscripciones y pagos (y las
-- fichas en papel) a la base.
--
--   · enrollments: quién invitó (enrolador), monto acordado y beca, para que el
--     "a cobrar" salga solo (monto acordado − pagos), y motivo de baja.
--   · payments: concepto (seña, inicial, cuota…) y mes que cubre (cuotas de
--     Formación). paid_at ya existía; ahora la carga manual deja elegir la fecha.
--   · follow_ups: seguimiento de egresados para el próximo programa (lo que hoy
--     es la hoja "BACKS PL").
--
-- Idempotente: seguro de correr más de una vez. Sólo agrega; no borra ni cambia
-- datos existentes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Inscripciones ─────────────────────────────────────────────────────────
ALTER TABLE public.enrollments
    -- Quien invitó a la persona a ESTE programa (egresado, staff, coach…).
    -- El nombre siempre; el perfil sólo si esa persona está en el sistema.
    ADD COLUMN IF NOT EXISTS enrolled_by_name       TEXT,
    ADD COLUMN IF NOT EXISTS enrolled_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Canal de inscripción: 'web', 'enrolador', 'presencial', etc.
    ADD COLUMN IF NOT EXISTS channel                TEXT,
    -- Lo que la persona tiene que pagar por este programa, ya con la beca aplicada.
    ADD COLUMN IF NOT EXISTS agreed_amount          NUMERIC,
    ADD COLUMN IF NOT EXISTS scholarship            TEXT NOT NULL DEFAULT 'none',
    -- Combo / 2x1 / "Inic + Av + PL" y cualquier acuerdo especial, en texto.
    ADD COLUMN IF NOT EXISTS deal_notes             TEXT,
    ADD COLUMN IF NOT EXISTS dropped_at             TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS drop_reason            TEXT,
    -- Datos sueltos de eventos (talle de remera, etc.) sin agregar columnas.
    ADD COLUMN IF NOT EXISTS extras                 JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_scholarship_check') THEN
        ALTER TABLE public.enrollments
            ADD CONSTRAINT enrollments_scholarship_check
            CHECK (scholarship IN ('none', 'half', 'full'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS enrollments_enrolled_by_profile_idx
    ON public.enrollments(enrolled_by_profile_id) WHERE enrolled_by_profile_id IS NOT NULL;

-- ── 2. Pagos ─────────────────────────────────────────────────────────────────
ALTER TABLE public.payments
    -- 'sena', 'inicial', 'completo', 'cuota', 'diferencia', 'evento', 'otro'
    ADD COLUMN IF NOT EXISTS concept      TEXT,
    -- Primer día del mes que cubre una cuota (Formación). NULL si no aplica.
    ADD COLUMN IF NOT EXISTS period_month DATE,
    ADD COLUMN IF NOT EXISTS notes        TEXT;

-- ── 3. Seguimientos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Programa que se le ofrece: 'avanzado', 'pl', 'formacion', …
    target           TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'contactar',
    -- Quién del equipo lo sigue ("encargada").
    owner_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    owner_name       TEXT,
    next_contact_at  DATE,
    notes            TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (profile_id, target)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follow_ups_status_check') THEN
        ALTER TABLE public.follow_ups
            ADD CONSTRAINT follow_ups_status_check
            CHECK (status IN ('contactar', 'sin_respuesta', 'duda', 'si', 'no', 'no_elegible'));
    END IF;
END $$;

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_access ON public.follow_ups;
CREATE POLICY staff_all_access ON public.follow_ups
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS follow_ups_status_idx ON public.follow_ups(target, status);

-- ── 4. Saldo por inscripción ─────────────────────────────────────────────────
-- "A cobrar" = monto acordado − pagos confirmados. security_invoker hace que la
-- vista respete el RLS de quien consulta (staff ve todo; nadie más ve pagos).
CREATE OR REPLACE VIEW public.enrollment_balances
WITH (security_invoker = true) AS
SELECT e.id AS enrollment_id,
       e.agreed_amount,
       COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0) AS paid_amount,
       CASE WHEN e.agreed_amount IS NULL THEN NULL
            ELSE e.agreed_amount - COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0)
       END AS balance
FROM public.enrollments e
LEFT JOIN public.payments p ON p.enrollment_id = e.id
GROUP BY e.id, e.agreed_amount;

GRANT SELECT ON public.enrollment_balances TO authenticated;
