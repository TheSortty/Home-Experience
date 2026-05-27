import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { resolveRole } from '@/src/services/roleService';
import CampusNav from './_components/CampusNav';
import ProfileMenu from './_components/ProfileMenu';
import StaffModeBar from './_components/StaffModeBar';
import WelcomeProfileModal from './_components/WelcomeProfileModal';
import CampusAnimator     from './_components/CampusAnimator';

export const metadata = {
  title: 'Mi Campus | HOME Experience',
  description: 'Espacio de alumno para programas de HOME Experience.',
};

export default async function CampusLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  // Wrap role + profile in try/catch so a transient Supabase I/O error
  // (Cloudflare Error 1101) doesn't crash the layout — we fall back to safe
  // defaults and the page still renders (Option A).
  let role: string | null = null;
  try {
    role = await resolveRole(supabase, user.id);
  } catch { /* safe default */ }

  type ProfileRow = { first_name: string; last_name: string; email: string; avatar_url: string | null; profile_completed_at: string | null };
  let profile: ProfileRow | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('profiles') as any)
      .select('first_name, last_name, email, avatar_url, profile_completed_at')
      .eq('user_id', user.id)
      .single() as { data: ProfileRow | null };
    profile = data;
  } catch { /* safe default: null */ }

  const firstName = profile?.first_name || 'Alumno';
  const lastName  = profile?.last_name  || '';
  const fullName  = `${firstName} ${lastName}`.trim();
  const email     = profile?.email || user.email || '' as string;
  const initials  =
    firstName.substring(0, 1).toUpperCase() +
    (lastName.substring(0, 1).toUpperCase() || '');

  // Show modal when the user has never completed their profile
  const showWelcome = profile?.profile_completed_at == null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">

      {/* ── Staff context bar (only for admin/sysadmin visiting campus) ──── */}
      <StaffModeBar role={role} actorName={fullName} />

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
            <CampusNav role={role ?? undefined} />
          </div>

          {/* Web principal — visible en desktop para todos los roles */}
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            ← Web principal
          </Link>

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

      {/* ── Welcome / profile-completion modal ────────────────────────── */}
      <WelcomeProfileModal
        firstName={firstName}
        showOnLoad={showWelcome}
      />

      {/* ── Page transition + scroll-reveal animations ────────────────── */}
      <CampusAnimator />

    </div>
  );
}
