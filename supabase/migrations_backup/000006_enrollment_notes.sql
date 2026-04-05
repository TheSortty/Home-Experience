CREATE TABLE enrollment_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE enrollment_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON enrollment_notes FOR ALL USING (true);
