import { requireSysadminPage } from '@/src/services/adminPageGuard';
import ComunicacionClient from './ComunicacionClient';

export default async function ComunicacionPage() {
  await requireSysadminPage();
  return <ComunicacionClient />;
}
