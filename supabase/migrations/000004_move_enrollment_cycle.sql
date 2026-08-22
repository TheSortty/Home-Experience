-- ─────────────────────────────────────────────────────────────────────────────
-- 000004 — Mover una inscripción de camada (CRESER)
--
-- Caso real: se inscribió a alguien en CRESER 54 cuando iba en la 55. Hasta
-- ahora la única salida era desvincular y volver a inscribir, lo que perdía
-- los pagos, las notas del staff, las metas y el historial de la inscripción.
--
-- Acá la inscripción se MUEVE: la fila de enrollments conserva su id, así que
-- todo lo que cuelga de ella (payments, enrollment_notes, student_goals,
-- weekly_checkins, submissions) viaja con la persona. Lo único que se descarta
-- es lo que sólo tiene sentido dentro de la camada de origen:
--
--   • attendance atada a cycle_sessions de la camada vieja
--   • el marcador de conflicto (conflicted_at / conflicted_session_id)
--   • coach_assignments acotadas a la camada vieja → se re-apuntan a la nueva
--
-- Dos RPCs:
--   preview_enrollment_move()  → qué pasaría (para avisar ANTES de confirmar)
--   move_enrollment_to_cycle() → lo hace, en una sola transacción
--
-- Ambas son sólo para staff. Idempotente: seguro de correr más de una vez.
-- ─────────────────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------------------
-- Helper: los tipos de ciclo que son CRESER.
-- Espeja CRESER_CYCLE_TYPES en src/features/admin/personas/types.ts.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_creser_cycle_type(p_type TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
    SELECT p_type IN ('initial', 'advanced', 'plan_lider');
$$;

-- ---------------------------------------------------------------------------
-- Helper: recalcula enrolled_count desde la realidad, en vez de sumar/restar 1.
-- Los ±1 sueltos se desincronizan; esto deja el contador siempre exacto.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recount_cycle_enrollments(p_cycle_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_cycle_id IS NULL THEN RETURN 0; END IF;

    SELECT count(*) INTO v_count
      FROM public.enrollments
     WHERE cycle_id = p_cycle_id;

    UPDATE public.cycles SET enrolled_count = v_count WHERE id = p_cycle_id;
    RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- preview_enrollment_move(): simulacro. No escribe nada.
--
-- Devuelve `ok` (si el movimiento es posible), `blocker` (por qué no) y los
-- datos que el modal necesita para avisar: cuántas asistencias se pierden,
-- si la camada destino está llena, si cambia el tipo de programa.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.preview_enrollment_move(
    p_enrollment_id   UUID,
    p_target_cycle_id UUID
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_user_id      UUID;
    v_source_cycle public.cycles%ROWTYPE;
    v_target_cycle public.cycles%ROWTYPE;
    v_attendance   INTEGER := 0;
    v_duplicate    BOOLEAN;
    v_is_full      BOOLEAN := false;
BEGIN
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'Permission denied: solo staff puede mover inscripciones';
    END IF;

    SELECT user_id INTO v_user_id
      FROM public.enrollments WHERE id = p_enrollment_id;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'blocker', 'enrollment_not_found');
    END IF;

    SELECT c.* INTO v_source_cycle
      FROM public.cycles c
      JOIN public.enrollments e ON e.cycle_id = c.id
     WHERE e.id = p_enrollment_id;

    SELECT * INTO v_target_cycle FROM public.cycles WHERE id = p_target_cycle_id;

    IF v_target_cycle.id IS NULL OR v_target_cycle.is_deleted THEN
        RETURN jsonb_build_object('ok', false, 'blocker', 'target_not_found');
    END IF;

    IF v_source_cycle.id = v_target_cycle.id THEN
        RETURN jsonb_build_object('ok', false, 'blocker', 'same_cycle');
    END IF;

    -- Esta RPC es para CRESER. Los cursos del Campus LMS se manejan aparte.
    IF NOT public.is_creser_cycle_type(v_target_cycle.type) THEN
        RETURN jsonb_build_object('ok', false, 'blocker', 'target_not_creser');
    END IF;
    IF v_source_cycle.id IS NOT NULL AND NOT public.is_creser_cycle_type(v_source_cycle.type) THEN
        RETURN jsonb_build_object('ok', false, 'blocker', 'source_not_creser');
    END IF;

    -- La persona ya está en la camada destino con OTRA inscripción.
    SELECT EXISTS (
        SELECT 1 FROM public.enrollments
         WHERE user_id  = v_user_id
           AND cycle_id = p_target_cycle_id
           AND id <> p_enrollment_id
    ) INTO v_duplicate;

    IF v_duplicate THEN
        RETURN jsonb_build_object('ok', false, 'blocker', 'already_enrolled_in_target');
    END IF;

    -- Asistencias que quedan huérfanas: las de jornadas de la camada de origen.
    SELECT count(*) INTO v_attendance
      FROM public.attendance a
      JOIN public.cycle_sessions s ON s.id = a.cycle_session_id
     WHERE a.enrollment_id = p_enrollment_id
       AND s.cycle_id = v_source_cycle.id;

    v_is_full := v_target_cycle.capacity IS NOT NULL
             AND COALESCE(v_target_cycle.enrolled_count, 0) >= v_target_cycle.capacity;

    RETURN jsonb_build_object(
        'ok',                    true,
        'blocker',               NULL,
        'source_cycle_id',       v_source_cycle.id,
        'source_cycle_name',     v_source_cycle.name,
        'source_cycle_type',     v_source_cycle.type,
        'target_cycle_name',     v_target_cycle.name,
        'target_cycle_type',     v_target_cycle.type,
        'type_changes',          v_source_cycle.type IS DISTINCT FROM v_target_cycle.type,
        'attendance_to_discard', v_attendance,
        'target_is_full',        v_is_full,
        'target_capacity',       v_target_cycle.capacity,
        'target_enrolled_count', COALESCE(v_target_cycle.enrolled_count, 0)
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- move_enrollment_to_cycle(): el movimiento real.
--
-- p_allow_overbook: seguir aunque la camada destino esté completa. El admin
-- que corrige un error de carga no debería quedar trabado por el cupo, pero
-- tiene que decirlo explícitamente.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.move_enrollment_to_cycle(
    p_enrollment_id   UUID,
    p_target_cycle_id UUID,
    p_allow_overbook  BOOLEAN DEFAULT false,
    p_reason          TEXT    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_preview     JSONB;
    v_user_id     UUID;
    v_source_id   UUID;
    v_actor       UUID;
    v_attendance  INTEGER := 0;
    v_coach_moved INTEGER := 0;
BEGIN
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'Permission denied: solo staff puede mover inscripciones';
    END IF;

    v_preview := public.preview_enrollment_move(p_enrollment_id, p_target_cycle_id);

    IF NOT (v_preview->>'ok')::BOOLEAN THEN
        RETURN jsonb_build_object('success', false, 'error', v_preview->>'blocker');
    END IF;

    IF (v_preview->>'target_is_full')::BOOLEAN AND NOT p_allow_overbook THEN
        RETURN jsonb_build_object('success', false, 'error', 'target_full');
    END IF;

    v_source_id := (v_preview->>'source_cycle_id')::UUID;
    SELECT user_id INTO v_user_id FROM public.enrollments WHERE id = p_enrollment_id;
    v_actor := public.get_my_profile_id();

    -- 1. Asistencias de la camada de origen: no aplican a la nueva.
    WITH gone AS (
        DELETE FROM public.attendance a
         USING public.cycle_sessions s
         WHERE a.cycle_session_id = s.id
           AND a.enrollment_id = p_enrollment_id
           AND s.cycle_id = v_source_id
        RETURNING a.id
    )
    SELECT count(*) INTO v_attendance FROM gone;

    -- 2. Coaches asignados sólo para la camada vieja → re-apuntar a la nueva.
    --    Si la misma dupla coach/alumno ya existía en el destino, la vieja sobra
    --    (UNIQUE coach_profile_id, student_profile_id, cycle_id).
    DELETE FROM public.coach_assignments ca
     WHERE ca.student_profile_id = v_user_id
       AND ca.cycle_id = v_source_id
       AND EXISTS (
           SELECT 1 FROM public.coach_assignments dup
            WHERE dup.student_profile_id = ca.student_profile_id
              AND dup.coach_profile_id   = ca.coach_profile_id
              AND dup.cycle_id           = p_target_cycle_id
       );

    WITH moved AS (
        UPDATE public.coach_assignments
           SET cycle_id = p_target_cycle_id
         WHERE student_profile_id = v_user_id
           AND cycle_id = v_source_id
        RETURNING 1
    )
    SELECT count(*) INTO v_coach_moved FROM moved;

    -- 3. La inscripción cambia de camada. El conflicto apuntaba a una jornada
    --    de la camada vieja, así que deja de tener sentido.
    UPDATE public.enrollments
       SET cycle_id              = p_target_cycle_id,
           conflicted_at         = NULL,
           conflicted_session_id = NULL
     WHERE id = p_enrollment_id;

    -- 4. Contadores exactos en ambas puntas.
    PERFORM public.recount_cycle_enrollments(v_source_id);
    PERFORM public.recount_cycle_enrollments(p_target_cycle_id);

    -- 5. Rastro en auditoría.
    INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (
        v_actor,
        'enrollment.moved_cycle',
        jsonb_build_object(
            'enrollment_id',        p_enrollment_id,
            'student_profile_id',   v_user_id,
            'from_cycle_id',        v_source_id,
            'from_cycle_name',      v_preview->>'source_cycle_name',
            'to_cycle_id',          p_target_cycle_id,
            'to_cycle_name',        v_preview->>'target_cycle_name',
            'attendance_discarded', v_attendance,
            'overbooked',           (v_preview->>'target_is_full')::BOOLEAN,
            'reason',               p_reason
        )
    );

    RETURN jsonb_build_object(
        'success',                 true,
        'from_cycle_name',         v_preview->>'source_cycle_name',
        'to_cycle_name',           v_preview->>'target_cycle_name',
        'attendance_discarded',    v_attendance,
        'coach_assignments_moved', v_coach_moved
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_creser_cycle_type(TEXT)                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_enrollment_move(UUID, UUID)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_enrollment_to_cycle(UUID, UUID, BOOLEAN, TEXT) TO authenticated;
