-- Migration: 000002_progress_rpc.sql
-- Description: RPC function to get optimized student progress across all enrollments.

CREATE OR REPLACE FUNCTION public.get_student_progress(p_profile_id UUID DEFAULT NULL)
RETURNS TABLE (
    enrollment_id    UUID,
    enrollment_status TEXT,
    cycle_id         UUID,
    cycle_name       TEXT,
    course_id        UUID,
    course_title     TEXT,
    course_cover     TEXT,
    total_lessons    BIGINT,
    completed_lessons BIGINT,
    progress_percent INTEGER,
    next_lesson_id   UUID,
    next_lesson_title TEXT,
    next_module_title TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_pid UUID;
BEGIN
    v_pid := COALESCE(p_profile_id, public.get_my_profile_id());
    RETURN QUERY
    WITH enrolled AS (
        SELECT e.id AS eid, e.status AS estatus, c.id AS cid, c.name AS cname,
               co.id AS coid, co.title AS ctitle, co.cover_image_url AS ccover
        FROM enrollments e
        JOIN cycles c ON c.id = e.cycle_id
        LEFT JOIN courses co ON co.id = c.course_id
        WHERE e.user_id = v_pid AND e.status IN ('active','completed')
    ),
    lesson_counts AS (
        SELECT en.coid,
               COUNT(l.id) AS total,
               COUNT(lp.id) FILTER (WHERE lp.completed) AS done
        FROM enrolled en
        JOIN modules m ON m.course_id = en.coid AND m.is_published
        JOIN lessons l ON l.module_id = m.id AND l.is_published
        LEFT JOIN lesson_progress lp
          ON lp.lesson_id = l.id AND lp.user_id = v_pid AND lp.completed
        GROUP BY en.coid
    ),
    next_lessons AS (
        SELECT DISTINCT ON (en.coid)
               en.coid, l.id AS nlid, l.title AS nltitle, m.title AS nmtitle
        FROM enrolled en
        JOIN modules m ON m.course_id = en.coid AND m.is_published
        JOIN lessons l ON l.module_id = m.id AND l.is_published
        LEFT JOIN lesson_progress lp
          ON lp.lesson_id = l.id AND lp.user_id = v_pid AND lp.completed
        WHERE lp.id IS NULL
        ORDER BY en.coid, m.order_index, l.order_index
    )
    SELECT en.eid, en.estatus, en.cid, en.cname, en.coid, en.ctitle, en.ccover,
           COALESCE(lc.total,0), COALESCE(lc.done,0),
           CASE WHEN COALESCE(lc.total,0)>0
                THEN (COALESCE(lc.done,0)*100/lc.total)::INTEGER ELSE 0 END,
           nl.nlid, nl.nltitle, nl.nmtitle
    FROM enrolled en
    LEFT JOIN lesson_counts lc ON lc.coid = en.coid
    LEFT JOIN next_lessons nl ON nl.coid = en.coid;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_student_progress(UUID) TO authenticated;
