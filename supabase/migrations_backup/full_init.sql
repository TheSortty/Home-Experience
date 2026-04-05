-- Migration: 000000_init
-- Description: Single source of truth for HOME Experience database.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core tables
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE,
    email TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'auth'
          AND table_name = 'users'
    ) THEN
        ALTER TABLE profiles
        DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC,
    duration_days INTEGER,
    stage_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active', -- active, finished
    type TEXT NOT NULL, -- initial, advanced, plan_lider
    capacity INTEGER DEFAULT 30,
    enrolled_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES cycles(id) ON DELETE SET NULL,
    package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending', -- pending, active, completed, reset_required
    payment_status TEXT DEFAULT 'unpaid', -- unpaid, pending, paid
    pl_number INTEGER,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE cycle_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    label TEXT,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX cycle_sessions_unique_date
    ON cycle_sessions (cycle_id, session_date);

CREATE TABLE attendance (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    cycle_session_id UUID REFERENCES cycle_sessions(id) ON DELETE SET NULL,
    date DATE,
    status TEXT DEFAULT 'present', -- present, absent, late, excused
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE attendance
    ADD CONSTRAINT attendance_date_or_session_check
    CHECK (date IS NOT NULL OR cycle_session_id IS NOT NULL);

CREATE TABLE student_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    goal_description TEXT NOT NULL,
    target_date DATE,
    status TEXT DEFAULT 'pending', -- pending, achieved
    staff_feedback TEXT,
    week_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    target_date DATE,
    status TEXT DEFAULT 'in_progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'system',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_url TEXT
);

CREATE TABLE medical_info (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    under_treatment BOOLEAN,
    treatment_details TEXT,
    medication TEXT,
    allergies TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    author_name TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    cycle_text TEXT,
    roles TEXT[],
    quote TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    photo_url TEXT,
    video_url TEXT,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE site_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    input_type VARCHAR(50) NOT NULL DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
    data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES form_submissions(id) ON DELETE SET NULL,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,
    package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    amount NUMERIC,
    currency TEXT DEFAULT 'ARS',
    method TEXT DEFAULT 'manual', -- mercadopago, transfer, cash, manual
    status TEXT DEFAULT 'pending', -- pending, paid, failed
    external_id TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Legacy table kept for migration safety (not used by current UI)
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'pending',
    data JSONB NOT NULL
);

-- Seed site settings
INSERT INTO site_settings (key, value, label, description, category, input_type) VALUES
('contact_email', 'contacto@home-experience.com', 'Email de Contacto', 'Email visible en el pie de pÃ¡gina y secciÃ³n de contacto', 'contact', 'email'),
('contact_phone', '+54 9 11 1234-5678', 'TelÃ©fono de Contacto', 'NÃºmero visible para WhatsApp o llamadas', 'contact', 'text'),
('whatsapp', '+5491130586930', 'WhatsApp', 'NÃºmero de WhatsApp para contacto directo.', 'contact', 'tel'),
('phone', '+5491130586930', 'TelÃ©fono de llamadas', 'NÃºmero para recibir llamadas.', 'contact', 'tel'),
('price_initial', '45000', 'Precio: Inicial', 'Costo del curso Inicial', 'pricing', 'text'),
('price_advanced', '55000', 'Precio: Avanzado', 'Costo del curso Avanzado', 'pricing', 'text'),
('price_leadership', '75000', 'Precio: Liderazgo', 'Costo del curso Liderazgo', 'pricing', 'text'),
('price_combo_1_cash', '340000', 'Combo 1 (Efectivo)', 'Inicial + Avanzado (Efectivo)', 'pricing', 'text'),
('price_combo_1_card', '480000', 'Combo 1 (Tarjeta)', 'Inicial + Avanzado (Tarjeta)', 'pricing', 'text'),
('price_combo_2_cash', '630000', 'Combo 2 (Efectivo)', 'Inicial + Avanzado + Liderazgo (Efectivo)', 'pricing', 'text'),
('price_combo_2_card', '790000', 'Combo 2 (Tarjeta)', 'Inicial + Avanzado + Liderazgo (Tarjeta)', 'pricing', 'text'),
('link_mercadopago_initial', 'https://mp.ago.la/...', 'Link Pago: Inicial', 'Link de pago para curso Inicial', 'links', 'url'),
('link_mercadopago_advanced', 'https://mp.ago.la/...', 'Link Pago: Avanzado', 'Link de pago para curso Avanzado', 'links', 'url'),
('link_mercadopago_leadership', 'https://mp.ago.la/...', 'Link Pago: Liderazgo', 'Link de pago para curso Liderazgo', 'links', 'url')
ON CONFLICT (key) DO NOTHING;

-- Seed forms
INSERT INTO forms (slug, title, schema) VALUES 
('registration-main', 'InscripciÃ³n General', '[
    {"type": "text", "name": "firstName", "label": "Nombre", "required": true},
    {"type": "text", "name": "lastName", "label": "Apellido", "required": true},
    {"type": "email", "name": "email", "label": "Email", "required": true},
    {"type": "tel", "name": "phone", "label": "TelÃ©fono", "required": true},
    {"type": "date", "name": "birthDate", "label": "Fecha de Nacimiento", "required": true},
    {"type": "text", "name": "city", "label": "Ciudad / PaÃ­s", "required": true},
    {"type": "textarea", "name": "intention", "label": "Â¿QuÃ© buscas en este curso?", "required": true},
    {"type": "textarea", "name": "healthIssues", "label": "Problemas de Salud / Alergias", "required": false}
]')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO forms (slug, title, schema, is_active)
VALUES (
    'inscripcion-creser', 
    'InscripciÃ³n CRESER', 
    '[
        {"id": "firstName", "type": "text", "label": "Nombre", "required": true, "section": "personal"},
        {"id": "lastName", "type": "text", "label": "Apellido", "required": true, "section": "personal"},
        {"id": "preferredName", "type": "text", "label": "Â¿CÃ³mo te gustarÃ­a que te llamen?", "required": true, "section": "personal"},
        {"id": "age", "type": "text", "label": "Edad", "required": true, "section": "personal"},
        {"id": "dni", "type": "text", "label": "DNI", "required": true, "section": "personal"},
        {"id": "gender", "type": "radio", "label": "GÃ©nero", "options": ["Masculino", "Femenino", "Prefiero no decirlo", "Otro"], "required": true, "section": "personal"},
        {"id": "phone", "type": "tel", "label": "Celular (WhatsApp)", "placeholder": "+54 9...", "required": true, "section": "personal"},
        {"id": "address", "type": "text", "label": "Domicilio (Calle, Altura, Localidad)", "required": false, "section": "personal"},
        {"id": "occupation", "type": "text", "label": "OcupaciÃ³n y/o ProfesiÃ³n", "required": true, "section": "personal"},
        {"id": "email", "type": "email", "label": "Correo electrÃ³nico", "required": true, "section": "personal"},
        {"id": "instagram", "type": "text", "label": "Instagram (Opcional)", "placeholder": "@usuario", "required": false, "section": "personal"},
        {"id": "referredBy", "type": "text", "label": "Â¿QuiÃ©n te invitÃ³ al Programa CreSer? (Nombre y Apellido)", "required": true, "section": "personal"},
        {"id": "birthDate", "type": "date", "label": "Fecha de nacimiento", "required": true, "section": "personal"},
        {"id": "emergencyName", "type": "text", "label": "Nombre Contacto Emergencia", "required": true, "section": "personal"},
        {"id": "emergencyPhone", "type": "tel", "label": "TelÃ©fono Contacto Emergencia", "required": true, "section": "personal"},
        
        {"id": "intention", "type": "textarea", "label": "Â¿QuÃ© querÃ©s llevarte de esta experiencia? (IntenciÃ³n)", "required": true, "section": "dreams"},
        {"id": "dream1", "type": "textarea", "label": "SueÃ±o 1: Â¿QuÃ© querÃ©s? Â¿Para quÃ© lo querÃ©s?", "required": true, "section": "dreams"},
        {"id": "dream2", "type": "textarea", "label": "SueÃ±o 2: Â¿QuÃ© querÃ©s? Â¿Para quÃ© lo querÃ©s?", "required": true, "section": "dreams"},
        {"id": "dream3", "type": "textarea", "label": "SueÃ±o 3: Â¿QuÃ© querÃ©s? Â¿Para quÃ© lo querÃ©s?", "required": true, "section": "dreams"},
        
        {"id": "honestDeclaration", "type": "checkbox", "label": "ACEPTO SER HONESTO Y DETALLISTA EN ESTA DECLARACIÃ“N JURADA", "required": true, "section": "medical"},
        {"id": "underTreatment", "type": "radio", "label": "Â¿EstÃ¡s bajo tratamiento mÃ©dico o psicolÃ³gico actualmente?", "options": ["SÃ­", "No"], "required": true, "section": "medical"},
        {"id": "underTreatmentDetails", "type": "text", "label": "Detalles del tratamiento", "required": false, "section": "medical"},
        {"id": "chronicDisease", "type": "radio", "label": "Â¿PadecÃ©s alguna enfermedad crÃ³nica?", "options": ["SÃ­", "No"], "required": true, "section": "medical"},
        {"id": "chronicDiseaseDetails", "type": "text", "label": "Si respondiste que sÃ­, Â¿cuÃ¡l es esa enfermedad? Â¿Desde hace cuÃ¡nto tiempo estÃ¡s diagnosticado?", "required": false, "section": "medical"},
        {"id": "medication", "type": "radio", "label": "Â¿TomÃ¡s alguna medicaciÃ³n?", "options": ["SÃ­", "No"], "required": true, "section": "medical"},
        {"id": "medicationDetails", "type": "text", "label": "Detallar cuÃ¡l y dosis", "required": false, "section": "medical"},
        {"id": "allergies", "type": "radio", "label": "Â¿TenÃ©s alergias o condiciones fÃ­sicas relevantes?", "options": ["SÃ­", "No"], "required": true, "section": "medical"},
        {"id": "allergiesDetails", "type": "text", "label": "Detallar alergia/condiciÃ³n", "required": false, "section": "medical"},
        {"id": "psychiatricTreatment", "type": "radio", "label": "Â¿Actualmente te encontrÃ¡s bajo tratamiento psiquiÃ¡trico y/o psicolÃ³gico?", "options": ["Tratamiento psicolÃ³gico", "Tratamiento psiquiÃ¡trico", "Ambos", "Ninguno"], "required": true, "section": "medical"},
        {"id": "psychiatricTreatmentDetails", "type": "text", "label": "Si respondiste que SI a la anterior, Â¿cuÃ¡l es y hace cuÃ¡nto estÃ¡s diagnosticado?", "required": false, "section": "medical"},
        {"id": "alcoholAbuse", "type": "radio", "label": "Â¿HacÃ©s abuso de bebidas alcohÃ³licas?", "options": ["SÃ­", "No"], "required": true, "section": "medical"},
        {"id": "drugConsumption", "type": "radio", "label": "Â¿ConsumÃ­s alguna droga?", "options": ["SÃ­", "No"], "required": true, "section": "medical"},
        {"id": "drugConsumptionDetails", "type": "textarea", "label": "Si respondiste que sÃ­, contanos que tipo de drogas consumis, desde quÃ© edad y con que frecuencia lo haces?", "required": false, "section": "medical"},
        {"id": "addictionTreatment", "type": "radio", "label": "Â¿Hiciste algÃºn tratamiento de recuperaciÃ³n en adicciones en el Ãºltimo aÃ±o o lo estÃ¡s haciendo?", "options": ["SÃ­", "No"], "required": true, "section": "medical"},
        {"id": "pregnant", "type": "radio", "label": "Â¿EstÃ¡s embarazada?", "options": ["SÃ­", "No"], "required": true, "section": "medical"},

        {"id": "context", "type": "textarea", "label": "Contanos brevemente tu contexto actual: Â¿Con quiÃ©nes vivÃ­s? Â¿QuÃ© te gusta hacer?", "required": false, "section": "extra"},
        {"id": "qualities", "type": "textarea", "label": "Â¿CuÃ¡les considerÃ¡s que son cualidades que te diferencian?", "required": false, "section": "extra"},
        {"id": "dailyRoutine", "type": "textarea", "label": "Â¿CÃ³mo suele ser un dÃ­a tuyo?", "required": false, "section": "extra"},
        {"id": "energyLeaks", "type": "textarea", "label": "En el caso de tenerlas, Â¿cuÃ¡les creÃ©s que suelen ser tus fugas de energÃ­a?", "required": false, "section": "extra"},
        {"id": "lifeHistory", "type": "textarea", "label": "Contanos lo que te parezca importante que sepamos de tu historia de vida!", "required": false, "section": "extra"}
    ]'::jsonb,
    true
)
ON CONFLICT (slug) DO UPDATE
SET schema = EXCLUDED.schema;

-- Migrate legacy registrations into form_submissions
INSERT INTO form_submissions (form_id, data, status, created_at)
SELECT 
    (SELECT id FROM forms WHERE slug = 'registration-main'),
    data,
    status,
    created_at
FROM registrations
WHERE EXISTS (SELECT 1 FROM forms WHERE slug = 'registration-main');

-- RPC: Confirm Enrollment (using form_submissions)
CREATE OR REPLACE FUNCTION confirm_submission_enrollment(
    p_submission_id UUID,
    p_cycle_id UUID,
    p_payment_method VARCHAR,
    p_is_total_payment BOOLEAN
) RETURNS JSONB AS $$
DECLARE
    v_sub_data JSONB;
    v_user_id UUID;
    v_first_name TEXT;
    v_last_name TEXT;
    v_email TEXT;
    v_enrollment_id UUID;
    v_cycle_type TEXT;
BEGIN
    SELECT data, status INTO v_sub_data 
    FROM form_submissions 
    WHERE id = p_submission_id;

    IF v_sub_data IS NULL THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    v_first_name := v_sub_data->>'firstName';
    v_last_name := v_sub_data->>'lastName';
    v_email := v_sub_data->>'email';

    SELECT id INTO v_user_id FROM profiles WHERE email = v_email;

    IF v_user_id IS NULL THEN
        INSERT INTO profiles (first_name, last_name, email, role, created_at)
        VALUES (v_first_name, v_last_name, v_email, 'student', NOW())
        RETURNING id INTO v_user_id;
    END IF;

    INSERT INTO enrollments (user_id, cycle_id, status, payment_status, enrolled_at)
    VALUES (
        v_user_id,
        p_cycle_id,
        'active',
        CASE WHEN p_is_total_payment THEN 'paid' ELSE 'pending' END,
        NOW()
    )
    RETURNING id INTO v_enrollment_id;

    UPDATE cycles
    SET enrolled_count = enrolled_count + 1
    WHERE id = p_cycle_id;
    
    SELECT type INTO v_cycle_type FROM cycles WHERE id = p_cycle_id;

    UPDATE form_submissions
    SET status = 'enrolled'
    WHERE id = p_submission_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'enrollment_id', v_enrollment_id,
        'cycle_type', v_cycle_type
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Migration: 000001_open_access
-- Description: Open access policies and grants for development/testing.

-- Schema usage
grant usage on schema public to anon, authenticated;

-- Table permissions
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- Sequence permissions (for serial/bigserial)
grant usage, select on all sequences in schema public to anon, authenticated;

-- RLS open policies for all public tables
do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('drop policy if exists open_select on public.%I', r.tablename);
    execute format('drop policy if exists open_insert on public.%I', r.tablename);
    execute format('drop policy if exists open_update on public.%I', r.tablename);
    execute format('drop policy if exists open_delete on public.%I', r.tablename);

    execute format('create policy open_select on public.%I for select using (true)', r.tablename);
    execute format('create policy open_insert on public.%I for insert with check (true)', r.tablename);
    execute format('create policy open_update on public.%I for update using (true)', r.tablename);
    execute format('create policy open_delete on public.%I for delete using (true)', r.tablename);
  end loop;
end $$;
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
-- Migration: 000003_populate_medical_info
-- Migrates medical data from form_submissions.data (CRESER) into the structured medical_info table

INSERT INTO medical_info (
    user_id,
    under_treatment,
    treatment_details,
    medication,
    allergies,
    emergency_contact_name,
    emergency_contact_phone,
    updated_at
)
SELECT 
    p.id,
    CASE WHEN fs.data->>'underTreatment' = 'SÃ­' THEN true ELSE false END,
    COALESCE(fs.data->>'underTreatmentDetails', '') || 
        CASE WHEN fs.data->>'chronicDisease' = 'SÃ­' THEN '. Enfermedad crÃ³nica: ' || COALESCE(fs.data->>'chronicDiseaseDetails', 'Sin detalles') ELSE '' END ||
        CASE WHEN fs.data->>'psychiatricTreatment' != 'Ninguno' THEN '. Tratamiento psiq: ' || COALESCE(fs.data->>'psychiatricTreatment', '') || ' ' || COALESCE(fs.data->>'psychiatricTreatmentDetails', '') ELSE '' END,
    CASE WHEN fs.data->>'medication' = 'SÃ­' THEN COALESCE(fs.data->>'medicationDetails', 'SÃ­ (sin detalles)') ELSE NULL END,
    CASE WHEN fs.data->>'allergies' = 'SÃ­' THEN COALESCE(fs.data->>'allergiesDetails', 'SÃ­ (sin detalles)') ELSE NULL END,
    fs.data->>'emergencyName',
    fs.data->>'emergencyPhone',
    NOW()
FROM form_submissions fs
JOIN profiles p ON p.email = fs.email
WHERE p.role = 'student'
  AND fs.email IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
    under_treatment = EXCLUDED.under_treatment,
    treatment_details = EXCLUDED.treatment_details,
    medication = EXCLUDED.medication,
    allergies = EXCLUDED.allergies,
    emergency_contact_name = EXCLUDED.emergency_contact_name,
    emergency_contact_phone = EXCLUDED.emergency_contact_phone,
    updated_at = NOW();
z
ALTER TABLE enrollments ADD COLUMN notes TEXT;
CREATE TABLE enrollment_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE enrollment_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON enrollment_notes FOR ALL USING (true);
-- Migration: 000007_unified_rls_policies
-- Description: Unifies database security by applying strict RLS to ensure only staff can access data.

-- Fix for "Function Search Path Mutable" warning on existing confirm_submission_enrollment
ALTER FUNCTION public.confirm_submission_enrollment SET search_path = public;

-- 1. Create a helper function to check if the current user is an admin or sysadmin.
-- SECURITY DEFINER allows this function to bypass RLS to read the profiles table without infinite recursion.
-- SET search_path = public fixes the "Function Search Path Mutable" warning.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'sysadmin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean up ALL existing policies dynamically to eliminate the "RLS Policy Always True" warnings
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- We query the internal Postgres table of policies to find EVERY policy that exists
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND policyname NOT IN ('staff_all_access', 'public_insert_forms', 'public_read_testimonials')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 3. Apply the new secure policy to all public tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    -- Drop our own policy in case we are re-running this script
    EXECUTE format('DROP POLICY IF EXISTS staff_all_access ON public.%I', r.tablename);

    -- Ensure RLS is strictly enabled
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);

    -- Create the new, unified staff-only policy
    EXECUTE format('CREATE POLICY staff_all_access ON public.%I FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())', r.tablename);
  END LOOP;
END $$;

-- 4. Specific RLS Exceptions for Public Workflows

-- EXCEPTION A: The Landing Page needs to be able to INSERT form submissions anonymously or as authenticated students.
DROP POLICY IF EXISTS public_insert_forms ON public.form_submissions;
CREATE POLICY public_insert_forms ON public.form_submissions
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- EXCEPTION B: Testimonials are read by the Landing Page, so they need to be public for reading.
DROP POLICY IF EXISTS public_read_testimonials ON public.testimonials;
CREATE POLICY public_read_testimonials ON public.testimonials
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- 5. Re-grant general API access
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
-- Migration: 000008_public_read_forms
-- Description: Allows anyone (anonymous or authenticated) to read the form schemas.

-- 1. Explicitly allow public reading of form schemas
DROP POLICY IF EXISTS public_read_forms ON public.forms;
CREATE POLICY public_read_forms ON public.forms
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- 2. Also ensure cycles (for calendar) are readable by public
DROP POLICY IF EXISTS public_read_cycles ON public.cycles;
CREATE POLICY public_read_cycles ON public.cycles
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- 3. Ensure enrollments and profiles remain strictly protected (already covered by 000007 staff_all_access)
