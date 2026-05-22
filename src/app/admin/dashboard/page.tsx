import { createClient } from '@/utils/supabase/server';
import { resolveRole, isAdminRole } from '@/src/services/roleService';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const role = await resolveRole(supabase, user.id);

  // Coaches can reach /admin (layout allows them), but the full admin dashboard
  // is not for them — send them directly to their review area.
  if (!isAdminRole(role)) {
    redirect('/admin/lms');
  }

  return <AdminDashboardClient />;
}
