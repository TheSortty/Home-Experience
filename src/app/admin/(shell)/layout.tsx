import React from 'react';
import { requireAdminPage } from '@/src/services/adminPageGuard';
import AdminShell from '@/src/features/admin/shell/AdminShell';

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  // Coaches get bounced to /admin/lms; everyone reaching here is admin+.
  await requireAdminPage();
  return <AdminShell>{children}</AdminShell>;
}
