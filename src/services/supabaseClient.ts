import { createBrowserClient } from '@supabase/ssr'

// Usa las variables de entorno de Next.js, con fallback a las estáticas para evitar fallos.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qvdjpmcprbinvrcczyhp.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2ZGpwbWNwcmJpbnZyY2N6eWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTExODEsImV4cCI6MjA4MDM2NzE4MX0.vmTXYtXOFtbVHtpOZTN4ZNfBseR63utXat7o6hBRQy4'

// createBrowserClient mantiene el estado en COOKIES automáticamente, permitiendo a middleware.ts rotar el token.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
