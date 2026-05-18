-- Migration: 000004_staff_activity.sql
-- Description: Staff/coach activity feed.
--   * Adds the `coach` role (new intermediate role, NOT staff).
--   * coach_assignments links a coach to the students they look after.
--   * staff_activity_events is the canonical log of everything the admin
--     bandeja shows: content published, students accessing/submitting work,
--     coaches downloading/returning work, forum activity.
--   * Per-admin read state via staff_activity_event_reads (NOT JSONB) so
--     unread counts are a clean indexed query.

-- ── Helpers ────────────────────────────────────────────────────────────────

-- is_coach(): true iff the current auth user has role = 'coach'.
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
          AND role = 'coach'
    );
END;
$$;

-- is_staff_or_coach(): convenience for policies that should accept both.
CREATE OR REPLACE FUNCTION public.is_staff_or_coach()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN public.is_staff() OR public.is_coach();
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_coach()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_coach() TO authenticated;

-- ── coach_assignments ─────────────────────────────────────────────────────
-- One row per (coach, student) pair. Optional cycle_id scopes the assignment
-- to a specific cycle (so a coach can supervise a student only for one
-- program/cohort, not forever). NULL cycle_id means "all cycles".

CREATE TABLE IF NOT EXISTS public.coach_assignments (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id           UUID REFERENCES public.cycles(id) ON DELETE CASCADE,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    created_by         UUID REFERENCES public.profiles(id),
    UNIQUE (coach_profile_id, student_profile_id, cycle_id)
);

CREATE INDEX IF NOT EXISTS coach_assignments_coach_idx
    ON public.coach_assignments (coach_profile_id);
CREATE INDEX IF NOT EXISTS coach_assignments_student_idx
    ON public.coach_assignments (student_profile_id);

ALTER TABLE public.coach_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_access ON public.coach_assignments;
CREATE POLICY staff_all_access ON public.coach_assignments
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Coaches can SEE their own assignments (to know which students they oversee).
DROP POLICY IF EXISTS coach_view_own ON public.coach_assignments;
CREATE POLICY coach_view_own ON public.coach_assignments
    FOR SELECT TO authenticated
    USING (
        public.is_coach()
        AND coach_profile_id = public.get_my_profile_id()
    );

-- coach_oversees(subject_profile_id): true iff caller is a coach assigned to
-- that student in ANY cycle. Used by event-feed visibility policies.
CREATE OR REPLACE FUNCTION public.coach_oversees(subject_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    my_profile UUID;
BEGIN
    IF NOT public.is_coach() THEN
        RETURN FALSE;
    END IF;
    my_profile := public.get_my_profile_id();
    IF my_profile IS NULL OR subject_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.coach_assignments
        WHERE coach_profile_id = my_profile
          AND student_profile_id = subject_profile_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_oversees(UUID) TO authenticated;

-- ── staff_activity_events ──────────────────────────────────────────────────
-- One row per noteworthy action. The bandeja reads this table directly.
--
-- Naming convention for event_type: '<actor_scope>.<verb>'
--   content.material_published    — admin/coach uploaded a lesson resource
--   content.lesson_published      — admin published a lesson
--   content.session_scheduled     — admin scheduled a course/cycle session
--   content.forum_announcement    — admin posted in forum
--   student.material_accessed     — student opened a lesson resource
--   student.work_submitted        — student uploaded a submission
--   student.forum_question        — student created a forum post
--   coach.material_accessed       — coach opened a lesson resource
--   coach.work_returned           — coach reviewed a submission
--
-- subject_profile_id is "the student this event is about" (null when the event
-- is platform-wide, e.g. admin publishing content for everyone).

CREATE TABLE IF NOT EXISTS public.staff_activity_events (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    event_type         TEXT NOT NULL,
    actor_profile_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role         TEXT,
    subject_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_kind        TEXT,
    target_id          UUID,
    details            JSONB DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS staff_activity_events_created_at_idx
    ON public.staff_activity_events (created_at DESC);
CREATE INDEX IF NOT EXISTS staff_activity_events_event_type_idx
    ON public.staff_activity_events (event_type);
CREATE INDEX IF NOT EXISTS staff_activity_events_subject_idx
    ON public.staff_activity_events (subject_profile_id);
CREATE INDEX IF NOT EXISTS staff_activity_events_actor_idx
    ON public.staff_activity_events (actor_profile_id);

ALTER TABLE public.staff_activity_events ENABLE ROW LEVEL SECURITY;

-- Staff sees everything.
DROP POLICY IF EXISTS staff_all_access ON public.staff_activity_events;
CREATE POLICY staff_all_access ON public.staff_activity_events
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Coaches see events about their assigned students + platform-wide content
-- events (subject_profile_id IS NULL means "for everyone").
DROP POLICY IF EXISTS coach_view_scoped ON public.staff_activity_events;
CREATE POLICY coach_view_scoped ON public.staff_activity_events
    FOR SELECT TO authenticated
    USING (
        public.is_coach()
        AND (
            subject_profile_id IS NULL
            OR public.coach_oversees(subject_profile_id)
        )
    );

-- Authenticated users (any role) can INSERT events that describe their OWN
-- actions. This lets the client/server log a click or a submission without
-- needing service_role. The actor_profile_id MUST equal the caller; details
-- the policy enforces below.
DROP POLICY IF EXISTS self_insert ON public.staff_activity_events;
CREATE POLICY self_insert ON public.staff_activity_events
    FOR INSERT TO authenticated
    WITH CHECK (
        actor_profile_id = public.get_my_profile_id()
    );

-- ── staff_activity_event_reads ────────────────────────────────────────────
-- Per-admin read state (so each organizador has their own unread badge).
-- A row's presence means "this admin has read this event".

CREATE TABLE IF NOT EXISTS public.staff_activity_event_reads (
    event_id   UUID NOT NULL REFERENCES public.staff_activity_events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    PRIMARY KEY (event_id, profile_id)
);

CREATE INDEX IF NOT EXISTS staff_activity_event_reads_profile_idx
    ON public.staff_activity_event_reads (profile_id);

ALTER TABLE public.staff_activity_event_reads ENABLE ROW LEVEL SECURITY;

-- Each admin manages only their own read state. Staff and coaches qualify.
DROP POLICY IF EXISTS own_reads ON public.staff_activity_event_reads;
CREATE POLICY own_reads ON public.staff_activity_event_reads
    FOR ALL TO authenticated
    USING (profile_id = public.get_my_profile_id())
    WITH CHECK (profile_id = public.get_my_profile_id());

-- ── Convenience RPC: unread count for the calling admin ───────────────────
-- The bandeja sidebar badge calls this on poll/realtime tick.
CREATE OR REPLACE FUNCTION public.staff_activity_unread_count()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    my_profile UUID;
    cnt INTEGER;
BEGIN
    my_profile := public.get_my_profile_id();
    IF my_profile IS NULL THEN
        RETURN 0;
    END IF;

    IF public.is_staff() THEN
        SELECT count(*) INTO cnt
        FROM public.staff_activity_events e
        WHERE NOT EXISTS (
            SELECT 1 FROM public.staff_activity_event_reads r
            WHERE r.event_id = e.id AND r.profile_id = my_profile
        );
    ELSIF public.is_coach() THEN
        SELECT count(*) INTO cnt
        FROM public.staff_activity_events e
        WHERE (e.subject_profile_id IS NULL OR public.coach_oversees(e.subject_profile_id))
          AND NOT EXISTS (
              SELECT 1 FROM public.staff_activity_event_reads r
              WHERE r.event_id = e.id AND r.profile_id = my_profile
          );
    ELSE
        cnt := 0;
    END IF;

    RETURN COALESCE(cnt, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_activity_unread_count() TO authenticated;
