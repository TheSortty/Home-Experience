import { createClient } from '@supabase/supabase-js'

// Tu URL extraída automáticamente de tu clave
const supabaseUrl = 'https://qvdjpmcprbinvrcczyhp.supabase.co'

// Tu clave (la que me pasaste)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2ZGpwbWNwcmJpbnZyY2N6eWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTExODEsImV4cCI6MjA4MDM2NzE4MX0.vmTXYtXOFtbVHtpOZTN4ZNfBseR63utXat7o6hBRQy4'

export const supabase = createClient(supabaseUrl, supabaseKey)
