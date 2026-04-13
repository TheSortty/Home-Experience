-- Migration: 000002_creser_pl_expansion
-- Description: Carta de Enrolamiento (PL) + Planilla Magna + Linear Attendance Conflict Logic
-- Created At: 2026-04-12

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CYCLES: Add is_linear flag
--    true  → Inicial & Avanzado (asistencia absoluta, una ausencia = conflicto)
--    false → Plan Líder (seguimiento semanal, no asistencia binaria)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.cycles
  ADD COLUMN IF NOT EXISTS is_linear BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Mark existing linear types (Inicial + Avanzado) as linear.
-- Plan Líder is NOT linear — it uses weekly check-ins, not strict attendance.
UPDATE public.cycles SET is_linear = true  WHERE type IN ('initial', 'advanced');
UPDATE public.cycles SET is_linear = false WHERE type = 'plan_lider';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ENROLLMENTS: Add conflict timestamp for auditing
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS conflicted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS conflicted_session_id UUID REFERENCES public.cycle_sessions(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CARTA DE ENROLAMIENTO (student_goals)
--    One row per enrollment (PL stage), contains the full "contract" document.
--    goals_data JSONB stores all 5 life-area goals in a single column for
--    flexibility, avoiding 30+ nullable text columns.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_goals (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id    UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,

    -- Identidad & Contrato
    contrato         TEXT, -- "Yo soy un hombre/mujer que..."
    estiramiento     TEXT, -- Ej: "Angelito del amor"
    
    -- Patrón Limitante ("El Nabo")
    nabo_descripcion TEXT, -- Ej: "Juez Solitario"
    equipo_asistencia TEXT, -- Cómo el equipo apoya al alumno

    -- Metas por área de vida (JSONB)
    -- Structure per area: { goal, purpose, actions: [], metrics }
    goals_data JSONB NOT NULL DEFAULT '{
        "professional":  {"goal": "", "purpose": "", "actions": [], "metrics": ""},
        "personal":      {"goal": "", "purpose": "", "actions": [], "metrics": ""},
        "relationships": {"goal": "", "purpose": "", "actions": [], "metrics": ""},
        "community":     {"goal": "", "purpose": "", "actions": [], "metrics": ""},
        "legacy":        {"goal": "", "purpose": "", "actions": [], "metrics": ""}
    }'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,

    CONSTRAINT student_goals_enrollment_unique UNIQUE (enrollment_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PLANILLA MAGNA (weekly_checkins)
--    13 weeks × 5 life areas = weekly % progress tracking for PL students.
--    One row per week per enrollment. scores range 0-100.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weekly_checkins (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    week_number   INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 13),
    scores        JSONB NOT NULL DEFAULT '{
        "professional":  0,
        "personal":      0,
        "relationships": 0,
        "community":     0,
        "legacy":        0
    }'::jsonb,
    notes         TEXT,          -- Optional weekly narrative
    checkin_date  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,

    CONSTRAINT weekly_checkins_enrollment_week_unique UNIQUE (enrollment_id, week_number)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. LINEAR ATTENDANCE CONFLICT FUNCTION
--    Called by the application after saving an absence on a linear cycle.
--    Sets enrollment.status = 'conflict' and records which session triggered it.
--    If the absence is reversed (back to 'present'), restores 'active' status.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_linear_attendance(
    p_enrollment_id UUID,
    p_session_id    UUID,
    p_status        TEXT   -- 'present' | 'absent' | 'late'
)
RETURNS JSONB
SET search_path = public
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_is_linear BOOLEAN;
    v_cycle_id  UUID;
    v_result    JSONB;
BEGIN
    -- Check if this enrollment's cycle is linear
    SELECT c.is_linear, c.id
    INTO v_is_linear, v_cycle_id
    FROM enrollments e
    JOIN cycles c ON c.id = e.cycle_id
    WHERE e.id = p_enrollment_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Enrollment not found');
    END IF;

    -- Non-linear cycles (PL) → no conflict logic, just return ok
    IF NOT v_is_linear THEN
        RETURN jsonb_build_object('success', true, 'action', 'no_change_non_linear');
    END IF;

    IF p_status = 'absent' THEN
        -- Mark enrollment as in_conflict and record the triggering session
        UPDATE public.enrollments
        SET
            status               = 'conflict',
            conflicted_at        = timezone('utc', now()),
            conflicted_session_id = p_session_id
        WHERE id = p_enrollment_id
          AND status != 'conflict';  -- idempotent

        -- Insert an admin notification so the dashboard badge updates
        INSERT INTO public.notifications (user_id, title, body, type, action_url)
        SELECT
            p.id,
            'Alumno en Conflicto',
            'Un alumno ha faltado a una sesión obligatoria en un ciclo lineal.',
            'conflict',
            '/admin/dashboard'
        FROM public.profiles p
        WHERE p.role IN ('admin', 'sysadmin')
        LIMIT 5;  -- Only notify up to 5 staff members

        RETURN jsonb_build_object('success', true, 'action', 'marked_conflict');

    ELSIF p_status IN ('present', 'late') THEN
        -- Check if there are any remaining absences before restoring active
        IF NOT EXISTS (
            SELECT 1 FROM public.attendance
            WHERE enrollment_id = p_enrollment_id
              AND cycle_session_id != p_session_id
              AND status = 'absent'
        ) THEN
            -- No other absences — safe to restore to active
            UPDATE public.enrollments
            SET
                status                = 'active',
                conflicted_at         = NULL,
                conflicted_session_id = NULL
            WHERE id = p_enrollment_id
              AND status = 'conflict';

            RETURN jsonb_build_object('success', true, 'action', 'restored_active');
        ELSE
            RETURN jsonb_build_object('success', true, 'action', 'still_has_absences');
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'action', 'no_change');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS — Apply staff_all_access to new tables
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.student_goals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_access ON public.student_goals;
DROP POLICY IF EXISTS staff_all_access ON public.weekly_checkins;

CREATE POLICY staff_all_access ON public.student_goals
    FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_access ON public.weekly_checkins
    FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_student_goals_enrollment   ON public.student_goals(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_enrollment ON public.weekly_checkins(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_week       ON public.weekly_checkins(enrollment_id, week_number);
CREATE INDEX IF NOT EXISTS idx_cycles_is_linear           ON public.cycles(is_linear);
CREATE INDEX IF NOT EXISTS idx_enrollments_status         ON public.enrollments(status);
