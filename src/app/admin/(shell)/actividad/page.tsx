import { requireAdminPage } from '@/src/services/adminPageGuard';
import ActividadClient from './ActividadClient';

export default async function ActividadPage() {
  await requireAdminPage();
  return <ActividadClient />;
}
