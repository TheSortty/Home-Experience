-- Migration: 000006_activity_realtime.sql
-- Description: Enable realtime push for the staff activity bandeja so the
-- admin sidebar badge updates without polling. Same idempotent pattern as
-- realtime_setup.sql.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'staff_activity_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_activity_events;
  END IF;
END $$;
