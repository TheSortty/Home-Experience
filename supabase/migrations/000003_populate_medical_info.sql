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
    CASE WHEN fs.data->>'underTreatment' = 'Sí' THEN true ELSE false END,
    COALESCE(fs.data->>'underTreatmentDetails', '') || 
        CASE WHEN fs.data->>'chronicDisease' = 'Sí' THEN '. Enfermedad crónica: ' || COALESCE(fs.data->>'chronicDiseaseDetails', 'Sin detalles') ELSE '' END ||
        CASE WHEN fs.data->>'psychiatricTreatment' != 'Ninguno' THEN '. Tratamiento psiq: ' || COALESCE(fs.data->>'psychiatricTreatment', '') || ' ' || COALESCE(fs.data->>'psychiatricTreatmentDetails', '') ELSE '' END,
    CASE WHEN fs.data->>'medication' = 'Sí' THEN COALESCE(fs.data->>'medicationDetails', 'Sí (sin detalles)') ELSE NULL END,
    CASE WHEN fs.data->>'allergies' = 'Sí' THEN COALESCE(fs.data->>'allergiesDetails', 'Sí (sin detalles)') ELSE NULL END,
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
