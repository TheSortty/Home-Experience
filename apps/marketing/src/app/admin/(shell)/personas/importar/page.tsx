import { requireAdminPage } from '@home/services/adminPageGuard';
import ImportarClient from './ImportarClient';

export default async function ImportarPage() {
  await requireAdminPage();
  return <ImportarClient />;
}
