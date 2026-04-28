import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// createBrowserClient mantiene el estado en COOKIES automáticamente, permitiendo a middleware.ts rotar el token.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
