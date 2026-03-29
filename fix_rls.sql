-- Fix RLS policy for activity logs
DROP POLICY IF EXISTS "Superadmins can read all logs" ON activity_logs;
CREATE POLICY "Superadmins can read all logs"
    ON activity_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role = 'sysadmin'
        )
    );
