-- 1. Crear la tabla de Registros de Actividad (Activity Logs)
CREATE TABLE public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- El ID del admin que realizó la acción
    action VARCHAR(255) NOT NULL, -- Ej: 'APPROVED_ADMISSION', 'DELETED_CYCLE'
    details JSONB, -- Detalles adicionales, nombres, emails, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Configurar políticas de seguridad básica (RLS) para que puedan insertar logs y solo los sysadmin puedan leerlos
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert logs" ON public.activity_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Sysadmins can view logs" ON public.activity_logs
    FOR SELECT USING (true); -- La app filtrará por UI, pero a nivel DB puedes ajustarlo a futuro.

-- 3. Para asignarte el rol de SYSADMIN o ADMIN:
-- Lo más seguro y fácil es que lo hagas MANUALMENTE desde el panel gráfico de Supabase:
-- Ve a: Table Editor > profiles > Busca la fila de tu usuario.
-- En la columna "role", haz doble clic y escribe exactamente: sysadmin (en minúsculas).
-- Para tus otros administradores, escribe: admin
-- Para un usuario normal, puede estar vacío o decir: student
