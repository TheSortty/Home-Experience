-- Add module_type to distinguish regular modules from workshop modules.
-- Values: 'module' (default) | 'workshop'

ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS module_type TEXT NOT NULL DEFAULT 'module'
    CHECK (module_type IN ('module', 'workshop'));

-- Back-fill existing taller modules (title contains '(taller)')
UPDATE modules
SET module_type = 'workshop'
WHERE lower(title) LIKE '%taller%';

-- Grant access so PostgREST can read/write the new column
GRANT SELECT, INSERT, UPDATE ON modules TO authenticated;
