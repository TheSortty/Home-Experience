-- Migration: 000010_fix_auth_trigger
-- Description: Arregla el trigger de Supabase Auth para que si un usuario ya existe en profiles (por un formulario), se enlace el user_id y no tire error de clave duplicada.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'Alumno'),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    first_name = CASE 
                   WHEN public.profiles.first_name IS NULL OR public.profiles.first_name = 'EMPTY' THEN EXCLUDED.first_name 
                   ELSE public.profiles.first_name 
                 END,
    last_name = CASE 
                  WHEN public.profiles.last_name IS NULL OR public.profiles.last_name = 'EMPTY' THEN EXCLUDED.last_name 
                  ELSE public.profiles.last_name 
                END,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurarse de que el trigger esté asignado a la tabla de auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
