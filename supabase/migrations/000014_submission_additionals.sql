-- 000014_submission_additionals.sql
-- "Adicionales": lets a student attach extra files to an ALREADY-MADE delivery
-- (not a new version) — e.g. a file they forgot. This is gated: the coach or
-- organizer must enable it per submission (submissions.allow_additional). Each
-- attached file records whether it landed within the deadline or late
-- (submission_files.is_late) and whether it's an additional vs an original file
-- of the delivery (submission_files.is_additional).
--
-- Run in Supabase SQL Editor. Safe to re-run.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS allow_additional BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.submission_files
  ADD COLUMN IF NOT EXISTS is_late       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_additional BOOLEAN NOT NULL DEFAULT false;

-- Students already have INSERT on submission_files (sf_student_insert) and
-- coaches/admins already have UPDATE on submissions (coach_submissions_update /
-- staff_all_access), so the gate is enforced in the server action. No new
-- policies needed.

-- ── Multi-file devoluciones ──────────────────────────────────────────────────
-- A devolución (submission_reviews row) can now carry SEVERAL files instead of
-- the single legacy revised_storage_path/revised_file_name columns (kept for
-- backwards compatibility / old reviews). Files live in R2 under reviews/...
CREATE TABLE IF NOT EXISTS public.submission_review_files (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    UUID        NOT NULL REFERENCES public.submission_reviews(id) ON DELETE CASCADE,
  storage_key  TEXT        NOT NULL,
  file_name    TEXT        NOT NULL,
  content_type TEXT,
  size_bytes   BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS srf_review_idx ON public.submission_review_files(review_id);

ALTER TABLE public.submission_review_files ENABLE ROW LEVEL SECURITY;

-- Students: read files of reviews on their own submissions.
DROP POLICY IF EXISTS srf_student_select ON public.submission_review_files;
CREATE POLICY srf_student_select
  ON public.submission_review_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.submission_reviews r
      JOIN   public.submissions        s ON s.id = r.submission_id
      JOIN   public.profiles           p ON p.id = s.user_id
      WHERE  r.id = review_id AND p.user_id = auth.uid()
    )
  );

-- Coaches & admins: full access (they post the devoluciones).
DROP POLICY IF EXISTS srf_reviewer_all ON public.submission_review_files;
CREATE POLICY srf_reviewer_all
  ON public.submission_review_files FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid()
        AND  role IN ('admin', 'sysadmin', 'super_admin', 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid()
        AND  role IN ('admin', 'sysadmin', 'super_admin', 'coach')
    )
  );

GRANT SELECT, INSERT, DELETE ON public.submission_review_files TO authenticated;

NOTIFY pgrst, 'reload schema';
