import { requireSysadminPage } from '@/src/services/adminPageGuard';
import FormulariosClient from './FormulariosClient';

export default async function FormulariosPage() {
  await requireSysadminPage();
  return <FormulariosClient />;
}
