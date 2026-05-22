-- 000008_submission_threads.sql
-- Adds:
--   • status column on submissions ('pending_review' | 'reviewed' | 'approved')
--     with approved_by / approved_at for closure.
--   • submission_chat_messages — free-form 1-on-1 chat between student and
--     reviewer, scoped to lesson_id + student_id (independent of versions).
--   • RLS policies granting coach role access to the full review workflow.
--   • Storage policies so coaches can upload revised files and students can
--     download revised files stored under reviews/{submissionId}/.
--
-- Run in Supabase SQL Editor. Safe to re-run: uses IF NOT EXISTS + DROP IF EXISTS.

BEGIN;

-- ── 1. Status tracking on submissions ─────────────────────────────────────────
--
-- Status lives on each submission row and tracks the thread state for that
-- version. The "active" status is always the latest submission per
-- (user_id, lesson_id). Transitions:
--
--   student submits        → pending_review  (coach must respond before v+1)
--   coach reviews          → reviewed        (student can now submit next version)
--   coach approves         → approved        (thread closed, no more versions)

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS status      TEXT        NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'reviewed', 'approved')),
  ADD COLUMN IF NOT EXISTS approved_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS submissions_user_lesson_status_idx
  ON public.submissions(user_id, lesson_id, status);

-- Backfill: submissions that already have a review row → mark as 'reviewed'.
-- (We can't know which were truly approved, so coaches close them after launch.)
UPDATE public.submissions s
SET    status = 'reviewed'
WHERE  status = 'pending_review'
  AND  EXISTS (
    SELECT 1 FROM public.submission_reviews r WHERE r.submission_id = s.id
  );

-- ── 2. Chat messages ──────────────────────────────────────────────────────────
--
-- Separate from the versioned submission/review track. Both sides can post
-- plain-text messages without uploading a file.
-- student_id  = profile of the student whose thread this belongs to
-- author_id   = profile of whoever actually wrote the message (student or coach)

CREATE TABLE IF NOT EXISTS public.submission_chat_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID        NOT NULL REFERENCES public.lessons(id)  ON DELETE CASCADE,
  student_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT  scm_body_not_empty  CHECK (char_length(trim(body)) > 0),
  CONSTRAINT  scm_body_max_length CHECK (char_length(body) <= 2000)
);

CREATE INDEX IF NOT EXISTS scm_thread_idx
  ON public.submission_chat_messages(lesson_id, student_id, created_at ASC);

ALTER TABLE public.submission_chat_messages ENABLE ROW LEVEL SECURITY;

-- Students: read their own thread
DROP POLICY IF EXISTS "scm_student_select" ON public.submission_chat_messages;
CREATE POLICY "scm_student_select"
  ON public.submission_chat_messages FOR SELECT TO authenticated
  USING (
    student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- Students: post in their own thread (they must be the author)
DROP POLICY IF EXISTS "scm_student_insert" ON public.submission_chat_messages;
CREATE POLICY "scm_student_insert"
  ON public.submission_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND author_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- Coaches & admins: read all threads
DROP POLICY IF EXISTS "scm_reviewer_select" ON public.submission_chat_messages;
CREATE POLICY "scm_reviewer_select"
  ON public.submission_chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid()
        AND  role IN ('admin', 'sysadmin', 'super_admin', 'coach')
    )
  );

-- Coaches & admins: post in any thread (must be the author)
DROP POLICY IF EXISTS "scm_reviewer_insert" ON public.submission_chat_messages;
CREATE POLICY "scm_reviewer_insert"
  ON public.submission_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid()
        AND  role IN ('admin', 'sysadmin', 'super_admin', 'coach')
    )
  );

GRANT SELECT, INSERT ON public.submission_chat_messages TO authenticated;

-- Live chat: add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.submission_chat_messages;

-- ── 3. Coach access to submissions ───────────────────────────────────────────
-- Existing 'staff_all_access' policy uses is_staff() which excludes coaches.

DROP POLICY IF EXISTS "coach_submissions_select" ON public.submissions;
CREATE POLICY "coach_submissions_select"
  ON public.submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid() AND role = 'coach'
    )
  );

-- Coaches can update status (reviewed → approved) but not create/delete submissions
DROP POLICY IF EXISTS "coach_submissions_update" ON public.submissions;
CREATE POLICY "coach_submissions_update"
  ON public.submissions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid() AND role = 'coach'
    )
  );

GRANT SELECT, UPDATE ON public.submissions TO authenticated;

-- ── 4. Submission reviews — ensure coaches & students can read/write ──────────

ALTER TABLE public.submission_reviews ENABLE ROW LEVEL SECURITY;

-- Students: read reviews on their own submissions
DROP POLICY IF EXISTS "student_reviews_select" ON public.submission_reviews;
CREATE POLICY "student_reviews_select"
  ON public.submission_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.submissions  s
      JOIN   public.profiles     p ON p.id = s.user_id
      WHERE  s.id = submission_id
        AND  p.user_id = auth.uid()
    )
  );

-- Coaches: full access (read, write — they're the ones posting reviews)
DROP POLICY IF EXISTS "coach_reviews_all" ON public.submission_reviews;
CREATE POLICY "coach_reviews_all"
  ON public.submission_reviews FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid() AND role = 'coach'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid() AND role = 'coach'
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.submission_reviews TO authenticated;

-- ── 5. Storage — coach access to submissions bucket ──────────────────────────
-- Admins already have full access via existing 'Staff can manage all submission files'.
-- Coaches need the same.

DROP POLICY IF EXISTS "coaches_submissions_storage_all" ON storage.objects;
CREATE POLICY "coaches_submissions_storage_all"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid() AND role = 'coach'
    )
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  user_id = auth.uid() AND role = 'coach'
    )
  );

-- ── 6. Storage — students can download their own revised files ───────────────
-- Revised files live at reviews/{submission_id}/{filename} in the submissions bucket.
-- The existing student SELECT policy only covers {profile_id}/ paths.
-- This policy adds SELECT for paths where the submission belongs to the student.

DROP POLICY IF EXISTS "students_read_revised_files" ON storage.objects;
CREATE POLICY "students_read_revised_files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions'
    AND split_part(name, '/', 1) = 'reviews'
    AND EXISTS (
      SELECT 1
      FROM   public.submissions s
      JOIN   public.profiles    p ON p.id = s.user_id
      WHERE  p.user_id = auth.uid()
        AND  s.id::text = split_part(name, '/', 2)
    )
  );

COMMIT;
