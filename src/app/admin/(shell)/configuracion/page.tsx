import { requireSysadminPage } from '@/src/services/adminPageGuard';
import ConfiguracionClient from './ConfiguracionClient';

export default async function ConfiguracionPage() {
  await requireSysadminPage();
  return <ConfiguracionClient />;
}
