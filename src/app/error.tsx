'use client';

import { useEffect } from 'react';
import { IoRefreshOutline, IoWarningOutline } from 'react-icons/io5';

export default function RootError({
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
        <h2 className="text-xl font-bold text-slate-900">Algo salió mal</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Ocurrió un error inesperado. Podés intentar recargar o volver al inicio.
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#00A9CE] text-white text-sm font-bold rounded-xl hover:bg-[#0096b8] transition-colors"
      >
        <IoRefreshOutline size={16} />
        Reintentar
      </button>
    </div>
  );
}
