'use client';

import AdminPersonas from '@/src/features/admin/personas/AdminPersonas';

interface Props {
  role: 'admin' | 'sysadmin';
}

export default function PersonasClient({ role }: Props) {
  return <AdminPersonas role={role} />;
}
