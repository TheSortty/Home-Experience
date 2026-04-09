-- Migration: 000008_enable_realtime
-- Description: Enables Supabase Realtime for core tables to allow reactive, websocket-driven dashboard updates without polling.

BEGIN;

  -- Add tables to the supabase_realtime publication
  DO $$
  BEGIN
    -- We use DROP then ADD to ensure it gracefully handles execution without errors if the table is already in the publication.
    -- Wait, Postgres doesn't easily support IF EXISTS in ALTER PUBLICATION.
    -- The simplest safe way is to attempt to add them, ignoring duplicates via exception handling.
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE form_submissions;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE enrollments;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE cycles;
    EXCEPTION WHEN duplicate_object THEN END;

  END $$;
  
COMMIT;
