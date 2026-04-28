import { createBrowserClient } from '@supabase/ssr'

type SupabaseClient = ReturnType<typeof createBrowserClient>

let _client: SupabaseClient | null = null

// Lazy singleton: el cliente se crea la primera vez que se usa, no al importar el módulo.
// Esto evita que Next.js falle durante el build estático (prerenderizado de /_not-found, etc.)
// cuando las variables de entorno aún no están disponibles en el entorno de build.
const handler: ProxyHandler<object> = {
  get(_, prop: string | symbol) {
    if (!_client) {
      _client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    }
    return Reflect.get(_client, prop)
  },
}

export const supabase = new Proxy({}, handler) as SupabaseClient
