-- 000013_lesson_block_after_due.sql
-- Adds an optional hard deadline to lessons: when block_after_due = true, the
-- campus refuses new submissions once the due date (unlocked_at +
-- due_days_after_unlock) has passed. When false (default), late deliveries are
-- still accepted but flagged "entrega tardía" — the existing behaviour.
--
-- Run in Supabase SQL Editor. Safe to re-run.

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS block_after_due BOOLEAN NOT NULL DEFAULT false;

-- PostgREST schema cache reload so the new column is queryable immediately.
NOTIFY pgrst, 'reload schema';
