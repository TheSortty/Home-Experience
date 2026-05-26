import { requireAdminPage } from '@/src/services/adminPageGuard';
import PersonasClient from './PersonasClient';

export default async function PersonasPage() {
  const { role } = await requireAdminPage();
  return <PersonasClient role={role === 'sysadmin' || role === 'super_admin' ? 'sysadmin' : 'admin'} />;
}
