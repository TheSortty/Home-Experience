/**
 * Campus view modes.
 *
 * The campus routes (/dashboard, /cursos, /comunidad, /calendario, /perfil)
 * can be inhabited in three different ways depending on who's looking:
 *
 *   - 'student'    → an actual student (role === 'student'). Their real
 *                    enrollments, progress, etc. This is the default and
 *                    legacy behaviour.
 *   - 'organizer'  → an admin/sysadmin browsing the campus AS staff. They
 *                    see everything, their identity is visible to others,
 *                    nothing they do mutates student-progress tables.
 *   - 'preview'    → an admin/sysadmin asking "how does this look to a
 *                    student?". UI mimics the student view; we still avoid
 *                    writing progress so we don't pollute data.
 *
 * Mode is derived from (a) the caller's role and (b) the URL `?as=` param.
 * Default for admins is 'organizer'. Explicit `?as=student` (or the legacy
 * `?preview=true` alias) flips to 'preview'.
 */

export type CampusRole = 'student' | 'coach' | 'admin' | 'sysadmin' | 'super_admin' | string;
export type CampusViewMode = 'student' | 'organizer' | 'preview';

export function isStaffRole(role: CampusRole | null | undefined): boolean {
  return role === 'admin' || role === 'sysadmin' || role === 'super_admin';
}

/**
 * Resolve the active view mode from role + URL search params.
 *
 * `searchParams` accepts either a plain object (as awaited from Next.js
 * server components) or URLSearchParams (from client routing).
 */
export function resolveViewMode(
  role: CampusRole | null | undefined,
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams | null | undefined,
): CampusViewMode {
  const get = (key: string): string | undefined => {
    if (!searchParams) return undefined;
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    const v = (searchParams as Record<string, string | string[] | undefined>)[key];
    if (Array.isArray(v)) return v[0];
    return v ?? undefined;
  };

  if (!isStaffRole(role)) return 'student';

  const as = get('as');
  const preview = get('preview');
  if (as === 'student' || preview === 'true') return 'preview';
  return 'organizer';
}

/**
 * Whether the current mode should AVOID writing to student-progress tables.
 * `lesson_progress`, `resource_opens`, `submissions` etc. shouldn't get
 * polluted by staff browsing.
 */
export function isReadOnlyForProgress(mode: CampusViewMode): boolean {
  return mode === 'organizer' || mode === 'preview';
}
