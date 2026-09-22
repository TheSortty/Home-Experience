import { requireSysadminPage } from '@home/services/adminPageGuard';
import AuditoriaClient from './AuditoriaClient';

export default async function AuditoriaPage() {
  await requireSysadminPage();
  return <AuditoriaClient />;
}
