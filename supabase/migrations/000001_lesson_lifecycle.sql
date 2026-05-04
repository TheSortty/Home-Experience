-- =============================================================================
-- HOME Experience — Lesson lifecycle, tracking, submissions & reviews
-- Block 1/9 of the submission tracking system
-- =============================================================================

-- ── lessons: lifecycle + submission columns ──────────────────────────────────

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'unlocked'
    CHECK (status IN ('draft', 'scheduled', 'unlocked')),
  ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS due_days_after_unlock INTEGER,
  ADD COLUMN IF NOT EXISTS requires_submission BOOLEAN NOT NULL DEFAULT false;

-- ── lesson_progress: first-entry and first-play timestamps ───────────────────

ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS entered_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS video_played_at TIMESTAMP WITH TIME ZONE;

-- ── resource_opens: first time a student opens each material ─────────────────

CREATE TABLE IF NOT EXISTS public.resource_opens (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_resource_id UUID NOT NULL REFERENCES public.lesson_resources(id) ON DELETE CASCADE,
  opened_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (user_id, lesson_resource_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_opens_user_id ON public.resource_opens(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_opens_resource_id ON public.resource_opens(lesson_resource_id);

-- ── submissions: student file uploads ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id     UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  is_late       BOOLEAN NOT NULL DEFAULT false,
  version       INTEGER NOT NULL DEFAULT 1,
  submitted_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_lesson ON public.submissions(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_submissions_lesson_id   ON public.submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.submissions(submitted_at DESC);

-- ── submission_reviews: admin feedback + optional revised file ────────────────

CREATE TABLE IF NOT EXISTS public.submission_reviews (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id        UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  reviewed_by          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_text        TEXT,
  revised_storage_path TEXT,
  revised_file_name    TEXT,
  reviewed_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_reviews_submission_id ON public.submission_reviews(submission_id);

-- ── Storage: submissions bucket ───────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
DROP POLICY IF EXISTS "Students can upload own submissions"   ON storage.objects;
DROP POLICY IF EXISTS "Students can read own submissions"    ON storage.objects;
DROP POLICY IF EXISTS "Staff can manage all submission files" ON storage.objects;

CREATE POLICY "Students can upload own submissions"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "Students can read own submissions"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "Staff can manage all submission files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'submissions' AND public.is_staff())
  WITH CHECK (bucket_id = 'submissions' AND public.is_staff());

-- ── RLS: resource_opens ───────────────────────────────────────────────────────

ALTER TABLE public.resource_opens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_access                       ON public.resource_opens;
DROP POLICY IF EXISTS "Students can view own resource opens" ON public.resource_opens;
DROP POLICY IF EXISTS "Students can insert own resource opens" ON public.resource_opens;

CREATE POLICY staff_all_access
  ON public.resource_opens FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Students can view own resource opens"
  ON public.resource_opens FOR SELECT TO authenticated
  USING (user_id = public.get_my_profile_id());

CREATE POLICY "Students can insert own resource opens"
  ON public.resource_opens FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_my_profile_id());

-- ── RLS: submissions ─────────────────────────────────────────────────────────

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_access                  ON public.submissions;
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;

CREATE POLICY staff_all_access
  ON public.submissions FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Students can view own submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (user_id = public.get_my_profile_id());

CREATE POLICY "Students can insert own submissions"
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_my_profile_id());

-- ── RLS: submission_reviews ───────────────────────────────────────────────────

ALTER TABLE public.submission_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_access                             ON public.submission_reviews;
DROP POLICY IF EXISTS "Students can view own submission reviews"   ON public.submission_reviews;

CREATE POLICY staff_all_access
  ON public.submission_reviews FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Students can view own submission reviews"
  ON public.submission_reviews FOR SELECT TO authenticated
  USING (
    submission_id IN (
      SELECT id FROM public.submissions WHERE user_id = public.get_my_profile_id()
    )
  );

-- ── GRANTS ────────────────────────────────────────────────────────────────────

GRANT ALL ON public.resource_opens       TO authenticated;
GRANT ALL ON public.submissions          TO authenticated;
GRANT ALL ON public.submission_reviews   TO authenticated;

-- ── indexes on new lesson columns ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lessons_status    ON public.lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_unlock_at ON public.lessons(unlock_at);
