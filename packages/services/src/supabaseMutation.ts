import { supabase } from './supabaseClient'
import toast from 'react-hot-toast'

const MUTATION_TIMEOUT_MS = 10_000 // 10 segundos

/**
 * safeMutate
 * 
 * Envuelve una operación de Supabase en una Promesa con timeout.
 * Si la operación (mutación) tarda demasiado (generalmente por una sesión
 * colgada en el refresh), cancela la espera y notifica al usuario.
 */
export async function safeMutate<T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  // Creamos una promesa que rechaza después del timeout
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), MUTATION_TIMEOUT_MS)
  )

  try {
    // Competencia entre la operación real y el timeout
    const result = await Promise.race([operation(), timeout])
    return result
  } catch (err: any) {
    if (err.message === 'TIMEOUT') {
      console.error('[safeMutate] La operación excedió el tiempo límite (10s). Posible sesión colgada.')
      toast.error('La operación está tardando demasiado. Por favor, recargá la página.', {
        duration: 5000,
        icon: '⏳'
      })
      return { data: null, error: { message: 'Timeout: Sesión colgada', code: 'TIMEOUT' } }
    }
    
    // Si es un error normal de Supabase, lo dejamos pasar
    throw err
  }
}
