-- Migration: 20260120_schema_overhaul
-- Description: Add site_settings, dynamic forms, and refine admissions flow.

-- 0. Fix profiles table (ensure id has default)
ALTER TABLE IF EXISTS profiles 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 1. Site Settings (Global Configuration)
CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general', -- general, pricing, contact, links
    input_type VARCHAR(50) NOT NULL DEFAULT 'text', -- text, number, email, url, longtext
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial settings
INSERT INTO site_settings (key, value, label, description, category, input_type) VALUES
('contact_email', 'contacto@home-experience.com', 'Email de Contacto', 'Email visible en el pie de página y sección de contacto', 'contact', 'email'),
('contact_phone', '+54 9 11 1234-5678', 'Teléfono de Contacto', 'Número visible para WhatsApp o llamadas', 'contact', 'text'),
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

-- 2. Dynamic Forms
CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'registration-initial', 'contact-us'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL DEFAULT '[]', -- Array of field definitions {type, label, name, required...}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Registration Form
INSERT INTO forms (slug, title, schema) VALUES 
('registration-main', 'Inscripción General', '[
    {"type": "text", "name": "firstName", "label": "Nombre", "required": true},
    {"type": "text", "name": "lastName", "label": "Apellido", "required": true},
    {"type": "email", "name": "email", "label": "Email", "required": true},
    {"type": "tel", "name": "phone", "label": "Teléfono", "required": true},
    {"type": "date", "name": "birthDate", "label": "Fecha de Nacimiento", "required": true},
    {"type": "text", "name": "city", "label": "Ciudad / País", "required": true},
    {"type": "textarea", "name": "intention", "label": "¿Qué buscas en este curso?", "required": true},
    {"type": "textarea", "name": "healthIssues", "label": "Problemas de Salud / Alergias", "required": false}
]')
ON CONFLICT (slug) DO NOTHING;

-- 3. Form Submissions
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
    data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, enrolled
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Migrate Old Registrations (Optional / Best Effort)
-- IF registrations table exists, we can migrate data. 
-- For this script, we''ll assume we look at "registrations" table but won't delete it yet to be safe.
INSERT INTO form_submissions (form_id, data, status, created_at)
SELECT 
    (SELECT id FROM forms WHERE slug = 'registration-main'),
    data,
    status,
    created_at
FROM registrations
WHERE EXISTS (SELECT 1 FROM forms WHERE slug = 'registration-main');

-- 5. RPC: Confirm Enrollment V2 (Using form_submissions)
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
    v_submission_exists BOOLEAN;
BEGIN
    -- Check Submission
    SELECT data, status INTO v_sub_data 
    FROM form_submissions 
    WHERE id = p_submission_id;

    IF v_sub_data IS NULL THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    v_first_name := v_sub_data->>'firstName';
    v_last_name := v_sub_data->>'lastName';
    v_email := v_sub_data->>'email';

    -- Create/Get User Profile
    SELECT id INTO v_user_id FROM profiles WHERE email = v_email;

    IF v_user_id IS NULL THEN
        -- Assuming uuid-ossp is enabled for generate_v4 or similar logic if auth not strictly used
        INSERT INTO profiles (first_name, last_name, email, role, created_at)
        VALUES (v_first_name, v_last_name, v_email, 'student', NOW())
        RETURNING id INTO v_user_id;
    END IF;

    -- Create Enrollment
    INSERT INTO enrollments (user_id, cycle_id, status, payment_method, is_fully_paid, created_at)
    VALUES (
        v_user_id,
        p_cycle_id,
        'active',
        p_payment_method,
        p_is_total_payment,
        NOW()
    )
    RETURNING id INTO v_enrollment_id;

    -- Update Cycle Count
    UPDATE cycles
    SET enrolled_count = enrolled_count + 1
    WHERE id = p_cycle_id;
    
    SELECT type INTO v_cycle_type FROM cycles WHERE id = p_cycle_id;

    -- Update Submission Status
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
