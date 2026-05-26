import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { resolveRole, isAdminRole, type UserRole } from '@/src/services/roleService';

/**
 * Server-side guard for admin pages.
 * Bounces unauthenticated users to /auth/login and coaches to /admin/lms.
 * Returns the resolved role + user so pages can pass them down.
 */
export async function requireAdminPage(): Promise<{ role: UserRole; userId: string; email: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const role = await resolveRole(supabase, user.id);
  if (!isAdminRole(role)) redirect('/admin/lms');

  return { role, userId: user.id, email: user.email ?? null };
}

/**
 * Sysadmin-only guard. Use for /admin/configuracion, /admin/auditoria, /admin/formularios, /admin/comunicacion.
 */
export async function requireSysadminPage(): Promise<{ role: UserRole; userId: string; email: string | null }> {
  const { role, userId, email } = await requireAdminPage();
  if (role !== 'sysadmin' && role !== 'super_admin') redirect('/admin/actividad');
  return { role, userId, email };
}
