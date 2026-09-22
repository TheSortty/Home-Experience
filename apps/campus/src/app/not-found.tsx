import Link from 'next/link';
import { IoSearchOutline, IoHomeOutline } from 'react-icons/io5';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-1">
        <p className="text-8xl font-black text-slate-200 tracking-tighter select-none">404</p>
        <div className="w-10 h-10 rounded-full bg-[#00A9CE]/10 flex items-center justify-center mx-auto -mt-2">
          <IoSearchOutline size={20} className="text-[#00A9CE]" />
        </div>
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Página no encontrada</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">
          La URL que buscás no existe o fue movida.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-5 py-2.5 bg-[#00A9CE] text-white text-sm font-bold rounded-xl hover:bg-[#0096b8] transition-colors"
      >
        <IoHomeOutline size={16} />
        Ir al campus
      </Link>
    </div>
  );
}
