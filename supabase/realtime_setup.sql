-- AGREGAR TABLAS AL PUBLICATION DE REALTIME
-- Esto permite que los cambios en la base de datos se reflejen 
-- automáticamente en el panel de administración.

DO $$
BEGIN
  -- Solo agregar si no están ya en la publicación
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'courses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE courses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'modules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE modules;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lessons'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lessons;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lesson_resources'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lesson_resources;
  END IF;
END $$;
