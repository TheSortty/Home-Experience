import { requireAdminPage } from '@home/services/adminPageGuard';
import CargarFichaClient from './CargarFichaClient';

export default async function CargarFichaPage() {
  await requireAdminPage();
  return <CargarFichaClient />;
}
