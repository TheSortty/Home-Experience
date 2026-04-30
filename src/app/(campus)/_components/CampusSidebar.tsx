'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IoHomeOutline, IoBookOutline, IoCalendarOutline,
  IoPeopleOutline, IoLogOutOutline,
  IoMenuOutline, IoCloseOutline,
} from 'react-icons/io5';
import { logoutAction } from '../perfil/actions';

export interface SidebarProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  initials: string;
  avatarUrl?: string | null;
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Inicio',      icon: IoHomeOutline     },
  { href: '/cursos',    label: 'Mis Cursos',  icon: IoBookOutline     },
  { href: '/comunidad', label: 'Comunidad',   icon: IoPeopleOutline   },
  { href: '/calendario',label: 'Calendario',  icon: IoCalendarOutline },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <nav className="flex-1 px-4 py-4 space-y-1">
      {NAV_LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
            isActive(href)
              ? 'bg-white/10 text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function ProfileFooter({
  profile,
  pathname,
  onNavigate,
  onLogout,
}: {
  profile: SidebarProfile;
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="p-4 border-t border-white/10 space-y-1">
      <Link
        href="/perfil"
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          pathname === '/perfil' ? 'bg-white/10' : 'hover:bg-white/5'
        }`}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00A9CE] to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
            {profile.initials}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium text-white truncate">{profile.fullName}</p>
          <p className="text-xs text-slate-400 truncate">{profile.email}</p>
        </div>
      </Link>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <IoLogOutOutline size={20} />
        <span className="text-sm font-medium">Cerrar Sesión</span>
      </button>
    </div>
  );
}

export default function CampusSidebar({ profile }: { profile: SidebarProfile }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 bg-[#1a1f2e] text-white border-r border-slate-800">
        <div className="p-6 border-b border-white/5">
          <div className="text-2xl font-black tracking-tighter text-[#00A9CE]">
            HOME<span className="text-slate-100">.</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">Campus</p>
        </div>
        <NavLinks pathname={pathname} />
        <ProfileFooter profile={profile} pathname={pathname} onLogout={logoutAction} />
      </aside>

      {/* ── Mobile: fixed hamburger ──────────────────────────────────────── */}
      <button
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-[#1a1f2e] text-white rounded-lg shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <IoMenuOutline size={24} />
      </button>

      {/* ── Mobile: slide-in overlay ─────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <aside className="flex flex-col w-72 max-w-[85vw] h-full bg-[#1a1f2e] text-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="text-xl font-black tracking-tighter text-[#00A9CE]">
                HOME<span className="text-slate-100">.</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                aria-label="Cerrar menú"
              >
                <IoCloseOutline size={24} />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <ProfileFooter
              profile={profile}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              onLogout={logoutAction}
            />
          </aside>
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}
    </>
  );
}
