-- Migration: 000002_form_submissions_email
-- Adds real email column to form_submissions for indexed lookups

ALTER TABLE form_submissions 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill emails from JSONB data
UPDATE form_submissions 
SET email = data->>'email'
WHERE email IS NULL AND data->>'email' IS NOT NULL;

-- Create index for fast search
CREATE INDEX IF NOT EXISTS idx_form_submissions_email 
ON form_submissions(email);
