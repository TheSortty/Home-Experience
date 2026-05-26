import { requireSysadminPage } from '@/src/services/adminPageGuard';
import AuditoriaClient from './AuditoriaClient';

export default async function AuditoriaPage() {
  await requireSysadminPage();
  return <AuditoriaClient />;
}
