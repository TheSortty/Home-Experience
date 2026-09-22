import { requireAdminPage } from '@home/services/adminPageGuard';
import ActividadClient from './ActividadClient';

export default async function ActividadPage() {
  await requireAdminPage();
  return <ActividadClient />;
}
