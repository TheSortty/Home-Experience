import { requireAdminPage } from '@home/services/adminPageGuard';
import SeguimientosClient from './SeguimientosClient';

export default async function SeguimientosPage() {
  await requireAdminPage();
  return <SeguimientosClient />;
}
