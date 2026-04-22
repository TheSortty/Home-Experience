import React from 'react';
import Link from 'next/link';
import { IoHomeOutline, IoBookOutline, IoCalendarOutline, IoPeopleOutline, IoPersonOutline, IoLogOutOutline, IoMenuOutline, IoNotificationsOutline, IoSearchOutline } from 'react-icons/io5';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Mi Campus | HOME Experience',
  description: 'Espacio de alumno para programas de HOME Experience.',
};

export default async function CampusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const firstName = profile?.first_name || 'Alumno';
  const lastName = profile?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const email = profile?.email || user.email;
  const initials = firstName.substring(0, 1).toUpperCase() + (lastName.substring(0, 1).toUpperCase() || '');

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden text-slate-800">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#1a1f2e] text-white border-r border-slate-800">
        <div className="p-6">
          <div className="text-2xl font-black tracking-tighter text-[#00A9CE]">
            HOME<span className="text-slate-100">.</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">Campus</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 text-white font-medium transition-colors">
            <IoHomeOutline size={20} />
            <span>Inicio</span>
          </Link>
          <Link href="/cursos" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-colors">
            <IoBookOutline size={20} />
            <span>Mis Cursos</span>
          </Link>
          <Link href="/comunidad" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-colors">
            <IoPeopleOutline size={20} />
            <span>Comunidad</span>
          </Link>
          <Link href="/calendario" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-colors">
            <IoCalendarOutline size={20} />
            <span>Calendario</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link href="/perfil" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00A9CE] to-blue-500 flex items-center justify-center text-white font-bold">
                {initials}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{fullName}</p>
              <p className="text-xs text-slate-400 truncate">{email}</p>
            </div>
          </Link>
          <button className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <IoLogOutOutline size={20} />
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10">
          <div className="flex items-center md:hidden gap-3">
            <button className="text-slate-500 hover:text-slate-900">
              <IoMenuOutline size={28} />
            </button>
            <div className="text-xl font-black tracking-tighter text-[#00A9CE]">
              HOME<span className="text-slate-900">.</span>
            </div>
          </div>

          <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2 w-96">
            <IoSearchOutline className="text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar clases, recursos, compañeros..." 
              className="bg-transparent border-none outline-none flex-1 ml-2 text-sm text-slate-700 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="relative text-slate-500 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-100">
              <IoNotificationsOutline size={24} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full object-cover md:hidden shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00A9CE] to-blue-500 md:hidden flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {initials}
              </div>
            )}
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>

      </div>
    </div>
  );
}
