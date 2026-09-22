import { requireSysadminPage } from '@home/services/adminPageGuard';
import FormulariosClient from './FormulariosClient';

export default async function FormulariosPage() {
  await requireSysadminPage();
  return <FormulariosClient />;
}
