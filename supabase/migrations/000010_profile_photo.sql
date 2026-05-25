-- Migration: profile_photo
-- Adds profile_completed_at to track onboarding state.
-- When NULL → show welcome/profile-completion modal on campus entry.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

-- Existing users that already have a photo are considered completed.
UPDATE public.profiles
SET profile_completed_at = NOW()
WHERE avatar_url IS NOT NULL AND profile_completed_at IS NULL;
