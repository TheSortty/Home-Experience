'use client';

import { useSearchParams } from 'next/navigation';
import AdminAdmissions from '@/src/features/dashboard/admin/AdminAdmissions';

export default function InscripcionesClient() {
  const searchParams = useSearchParams();
  const q = searchParams?.get('q') ?? '';
  return <AdminAdmissions searchTerm={q} />;
}
