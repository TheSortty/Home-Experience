/**
 * Quién puede ver QUÉ curso del CAMPUS LMS.
 *
 * Asignación directa: una fila en `course_access` por (alumno, curso), que
 * carga el organizador desde el panel del curso (Programas → curso → Accesos).
 *
 * NO se deriva de las inscripciones a ciclos: los cursos del campus son
 * contenido propio del LMS y no espejan los programas de CRESER. Un alumno
 * puede estar en CRESER INICIAL 55 y tener asignados cero, uno o varios cursos.
 *
 * Staff (admin/sysadmin/super_admin) y coaches ven todo el catálogo: dictan y
 * corrigen entregas de cualquier programa.
 *
 * Los cursos SIN acceso no se ocultan: se muestran bloqueados, como vidriera.
 * Lo que sí queda oculto (por el RLS de la migración 000002) es el contenido —
 * módulos, clases, materiales, videos y el foro de ese curso.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isReviewerRole } from './roleService';

/** True para los roles que ven el catálogo completo (staff + coach). */
export function seesEveryCourse(role: string | null | undefined): boolean {
  return isReviewerRole(role ?? '');
}

/**
 * IDs de los cursos asignados a este perfil.
 * No contempla el rol — para eso está `seesEveryCourse`.
 */
export async function getAssignedCourseIds(
  supabase: SupabaseClient<any, 'public', any>,
  profileId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('course_access')
    .select('course_id')
    .eq('profile_id', profileId);

  if (error) {
    console.error('[courseAccess] no se pudieron leer los accesos:', error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row: any) => row.course_id as string));
}

/**
 * Resuelve el acceso completo (rol + asignaciones) en una sola llamada.
 * `all: true` significa "ve todo el catálogo" y hace que `ids` sea irrelevante.
 */
export async function resolveCourseAccess(
  supabase: SupabaseClient<any, 'public', any>,
  profileId: string | null | undefined,
  role: string | null | undefined,
): Promise<{ all: boolean; ids: Set<string>; can: (courseId: string | null | undefined) => boolean }> {
  if (seesEveryCourse(role)) {
    return { all: true, ids: new Set(), can: () => true };
  }
  const ids = profileId ? await getAssignedCourseIds(supabase, profileId) : new Set<string>();
  return { all: false, ids, can: (courseId) => !!courseId && ids.has(courseId) };
}

/** Atajo para una sola página de curso. */
export async function hasCourseAccess(
  supabase: SupabaseClient<any, 'public', any>,
  profileId: string | null | undefined,
  role: string | null | undefined,
  courseId: string,
): Promise<boolean> {
  const access = await resolveCourseAccess(supabase, profileId, role);
  return access.can(courseId);
}
