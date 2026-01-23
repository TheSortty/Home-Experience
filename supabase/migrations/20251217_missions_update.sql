-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Cycles Table (Mission 1)
-- Dropping existing to ensure schema matches requirements if it was a mock
DROP TABLE IF EXISTS cycles CASCADE;

CREATE TABLE cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- e.g "Inicial Agosto", "Avanzado Septiembre"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, finished
    type VARCHAR(50) NOT NULL, -- initial, advanced, plan_lider
    capacity INTEGER DEFAULT 30,
    enrolled_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Student Goals (Mission 3)
CREATE TABLE IF NOT EXISTS student_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL, -- Link to enrollment (which links to user & cycle)
    goal_description TEXT NOT NULL,
    target_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, achieved
    staff_feedback TEXT,
    week_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Admissions Brain (Mission 2) - Helper Function
-- This function handles the atomic operation of confirming a student
CREATE OR REPLACE FUNCTION confirm_registration_v1(
    p_registration_id UUID,
    p_cycle_id UUID,
    p_payment_method VARCHAR,
    p_is_total_payment BOOLEAN
) RETURNS JSONB AS $$
DECLARE
    v_reg_data JSONB;
    v_user_id UUID;
    v_first_name TEXT;
    v_last_name TEXT;
    v_email TEXT;
    v_enrollment_id UUID;
    v_cycle_type TEXT;
    v_new_student_data JSONB;
BEGIN
    -- 1. Get Registration Data
    SELECT data, status INTO v_reg_data
    FROM registrations
    WHERE id = p_registration_id;

    IF v_reg_data IS NULL THEN
        RAISE EXCEPTION 'Registration not found';
    END IF;

    v_first_name := v_reg_data->>'firstName';
    v_last_name := v_reg_data->>'lastName';
    v_email := v_reg_data->>'email';

    -- 2. Create or Get User (In a real app, we might check if user exists in auth.users or profiles)
    -- For this simpler version, we assume we create a profile entry directly.
    -- Ideally, this should be linked to auth.users, but we'll create a profile for now.
    
    -- Check if profile exists by email (simple check)
    SELECT id INTO v_user_id FROM profiles WHERE email = v_email;

    IF v_user_id IS NULL THEN
        INSERT INTO profiles (first_name, last_name, email, role, created_at)
        VALUES (v_first_name, v_last_name, v_email, 'student', NOW())
        RETURNING id INTO v_user_id;
    END IF;

    -- 3. Move Medical Info (simplified mapping)
    INSERT INTO medical_info (user_id, allergies, medication, under_treatment, treatment_details, emergency_contact_name, emergency_contact_phone)
    VALUES (
        v_user_id,
        v_reg_data->>'allergies',
        v_reg_data->>'medication',
        v_reg_data->>'underTreatment',
        v_reg_data->>'treatmentDetails',
        v_reg_data->>'emergencyName',
        v_reg_data->>'emergencyPhone'
    );

    -- 4. Create Enrollment
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

    -- 5. Update Cycle Count
    UPDATE cycles
    SET enrolled_count = enrolled_count + 1
    WHERE id = p_cycle_id;
    
    -- Get cycle info for response
    SELECT type INTO v_cycle_type FROM cycles WHERE id = p_cycle_id;

    -- 6. Update Registration Status
    UPDATE registrations
    SET status = 'approved'
    WHERE id = p_registration_id;

    -- Return success data
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
