'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { IoRefreshOutline, IoWarningOutline, IoArrowBackOutline } from 'react-icons/io5';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <IoWarningOutline size={28} className="text-red-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">Error en el panel</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Ocurrió un error inesperado. Podés reintentar o volver al dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 mt-2 font-mono">ref: {error.digest}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors"
        >
          <IoRefreshOutline size={16} />
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
        >
          <IoArrowBackOutline size={16} />
          Volver
        </Link>
      </div>
    </div>
  );
}
