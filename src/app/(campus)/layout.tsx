import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CampusNav from './_components/CampusNav';
import ProfileMenu from './_components/ProfileMenu';

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
    <div className="min-h-screen bg-slate-50 text-slate-800">

      {/* ── Top navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="h-16 flex items-center justify-between px-4 md:px-8 gap-4">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-black tracking-tighter text-[#00A9CE]">
              HOME<span className="text-slate-900">.</span>
            </span>
          </Link>

          {/* Nav (handles mobile drawer + desktop horizontal links) */}
          <div className="flex-1 flex justify-center">
            <CampusNav />
          </div>

          {/* Profile */}
          <ProfileMenu
            firstName={firstName}
            lastName={lastName}
            fullName={fullName}
            email={email}
            initials={initials}
            avatarUrl={profile?.avatar_url}
          />
        </div>
      </header>

      {/* ── Page content (full-width) ──────────────────────────────────── */}
      <main className="px-4 md:px-8 py-6 md:py-10">
        {children}
      </main>

    </div>
  );
}
