import React from 'react';
import { IoNotificationsOutline, IoSearchOutline } from 'react-icons/io5';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CampusSidebar from './_components/CampusSidebar';

export const metadata = {
  title: 'Mi Campus | HOME Experience',
  description: 'Espacio de alumno para programas de HOME Experience.',
};

export default async function CampusLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, avatar_url')
    .eq('user_id', user.id)
    .single();

  const firstName = profile?.first_name || 'Alumno';
  const lastName  = profile?.last_name  || '';
  const fullName  = `${firstName} ${lastName}`.trim();
  const email     = profile?.email || user.email || '';
  const initials  =
    firstName.substring(0, 1).toUpperCase() +
    (lastName.substring(0, 1).toUpperCase() || '');

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden text-slate-800">

      <CampusSidebar
        profile={{ firstName, lastName, fullName, email, initials, avatarUrl: profile?.avatar_url }}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* ── Topbar ──────────────────────────────────────────────────────── */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10">
          {/* Spacer so content doesn't slide under the fixed mobile hamburger */}
          <div className="w-10 md:hidden" />

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
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </button>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-9 h-9 rounded-full object-cover md:hidden shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00A9CE] to-blue-500 md:hidden flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {initials}
              </div>
            )}
          </div>
        </header>

        {/* ── Page content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>

      </div>
    </div>
  );
}
