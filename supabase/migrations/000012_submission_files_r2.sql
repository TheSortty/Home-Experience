-- 000012_submission_files_r2.sql
-- Multi-file submissions stored in Cloudflare R2 (bucket `campus-entregas`).
--
-- Until now a `submissions` row carried a single file (storage_path/file_name)
-- or an external link (submission_url). We move to:
--   • The `submissions` row is the "envelope" for one delivery / version.
--   • Each actual file lives in the new `submission_files` child table, with
--     its R2 object key. A single delivery can hold many files.
--
-- R2 object keys are classified by course/lesson/student so a whole course,
-- lesson or student can be purged by prefix (to stay under the free 10 GB):
--   entregas/{courseId}/{lessonId}/{studentProfileId}/v{version}/{fileId}__{name}
--   reviews/{courseId}/{lessonId}/{studentProfileId}/v{version}/{fileId}__{name}
--
-- Run in Supabase SQL Editor. Safe to re-run: IF NOT EXISTS + DROP IF EXISTS.

BEGIN;

-- ── 1. submissions becomes an envelope ─────────────────────────────────────────
-- storage_path / file_name were NOT NULL (single-file model). With files moved
-- to submission_files, the envelope row no longer needs them.

ALTER TABLE public.submissions ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE public.submissions ALTER COLUMN file_name    DROP NOT NULL;

-- ── 2. submission_files ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.submission_files (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID        NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  storage_key   TEXT        NOT NULL,                    -- R2 object key
  file_name     TEXT        NOT NULL,                    -- original file name
  content_type  TEXT,
  size_bytes    BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submission_files_submission_idx
  ON public.submission_files(submission_id);

ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;

-- Students: read files of their own submissions
DROP POLICY IF EXISTS "sf_student_select" ON public.submission_files;
CREATE POLICY "sf_student_select"
  ON public.submission_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.submissions s
      JOIN   public.profiles    p ON p.id = s.user_id
      WHERE  s.id = submission_id
        AND  p.user_id = auth.uid()
    )
  );

-- Students: attach files to their own submissions
DROP POLICY IF EXISTS "sf_student_insert" ON public.submission_files;
CREATE POLICY "sf_student_insert"
  ON public.submission_files FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.submissions s
      JOIN   public.profiles    p ON p.id = s.user_id
      WHERE  s.id = submission_id
        AND  p.user_id = auth.uid()
    )
  );

-- Coaches & admins: read every file
DROP POLICY IF EXISTS "sf_reviewer_select" ON public.submission_files;
CREATE POLICY "sf_reviewer_select"
  ON public.submission_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid()
        AND  role IN ('admin', 'sysadmin', 'super_admin', 'coach')
    )
  );

-- Admins (organizadores) only: delete files. Coaches review but never delete.
DROP POLICY IF EXISTS "sf_admin_delete" ON public.submission_files;
CREATE POLICY "sf_admin_delete"
  ON public.submission_files FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid()
        AND  role IN ('admin', 'sysadmin', 'super_admin')
    )
  );

GRANT SELECT, INSERT, DELETE ON public.submission_files TO authenticated;

-- ── 3. Admins can delete submissions / reviews (purge a whole delivery) ───────
-- submission_files / submission_reviews cascade off submissions, but we also
-- expose an explicit DELETE policy so the admin "borrar entrega" action works.

DROP POLICY IF EXISTS "admin_submissions_delete" ON public.submissions;
CREATE POLICY "admin_submissions_delete"
  ON public.submissions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid()
        AND  role IN ('admin', 'sysadmin', 'super_admin')
    )
  );

GRANT DELETE ON public.submissions TO authenticated;

COMMIT;

-- After running, reload the PostgREST schema cache:
--   NOTIFY pgrst, 'reload schema';
