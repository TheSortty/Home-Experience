-- 000007_lesson_videos.sql
-- Multiple videos per lesson. Replaces the single video_url/duration_seconds
-- fields on lessons as the source of truth for the viewer.
-- lessons.video_url and lessons.duration_seconds are kept in sync by the
-- admin UI (first video URL / sum of durations) for backwards-compat with
-- dashboard thumbnails and the lesson sidebar.

CREATE TABLE IF NOT EXISTS lesson_videos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id        UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title            TEXT,
  video_url        TEXT        NOT NULL,
  duration_seconds INTEGER     NOT NULL DEFAULT 0,
  order_index      INTEGER     NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_videos_lesson_order_idx
  ON lesson_videos(lesson_id, order_index);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE lesson_videos ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (same as lessons / lesson_resources)
CREATE POLICY "lesson_videos_select"
  ON lesson_videos FOR SELECT TO authenticated
  USING (true);

-- Only admin / sysadmin / super_admin may write
CREATE POLICY "lesson_videos_insert"
  ON lesson_videos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'sysadmin', 'super_admin')
    )
  );

CREATE POLICY "lesson_videos_update"
  ON lesson_videos FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'sysadmin', 'super_admin')
    )
  );

CREATE POLICY "lesson_videos_delete"
  ON lesson_videos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'sysadmin', 'super_admin')
    )
  );

GRANT ALL ON lesson_videos TO authenticated;

-- ── Seed from existing single-video lessons ───────────────────────────────────
INSERT INTO lesson_videos (lesson_id, video_url, duration_seconds, order_index)
SELECT id, video_url, COALESCE(duration_seconds, 0), 1
FROM   lessons
WHERE  video_url IS NOT NULL AND video_url <> ''
ON CONFLICT DO NOTHING;
