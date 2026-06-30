'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IoMenuOutline, IoCloseOutline, IoChevronDownOutline, IoNotificationsOutline, IoSparklesOutline } from 'react-icons/io5';
import LogoutIcon from '../../../ui/icons/LogoutIcon';
import UsersIcon from '../../../ui/icons/UsersIcon';
import CalendarIcon from '../../../ui/icons/CalendarIcon';
import SettingsIcon from '../../../ui/icons/SettingsIcon';
import DocumentIcon from '../../../ui/icons/DocumentIcon';
import MailIcon from '../../../ui/icons/MailIcon';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../services/supabaseClient';
import { restSelect, restRpc } from '../../../services/supabaseRest';

import { CHANGELOG } from '@/src/data/changelog';
import '../../dashboard/admin/admin-reboot.css';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: 'unreadActivity' | 'pendingAdmissions';
  match?: (pathname: string) => boolean;
}

const ProgramsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/logo-circle.png" alt="" className={`object-cover rounded-full ${className ?? ''}`} />
);

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/actividad', label: 'Actividad', icon: IoNotificationsOutline as any, badgeKey: 'unreadActivity' },
  { href: '/admin/inscripciones', label: 'Inscripciones', icon: DocumentIcon, badgeKey: 'pendingAdmissions' },
  { href: '/admin/personas', label: 'Personas', icon: UsersIcon },
  { href: '/admin/programas', label: 'Programas', icon: ProgramsIcon },
  { href: '/admin/calendario', label: 'Calendario', icon: CalendarIcon },
];

const SYSADMIN_NAV: NavItem[] = [
  { href: '/admin/comunicacion', label: 'Comunicación', icon: MailIcon },
  { href: '/admin/formularios', label: 'Formulario y Encuestas', icon: DocumentIcon },
  { href: '/admin/configuracion', label: 'Configuración Web', icon: SettingsIcon },
  { href: '/admin/auditoria', label: 'Auditoría', icon: DocumentIcon },
];

const SECTION_TITLES: Record<string, string> = {
  '/admin/actividad': 'Actividad',
  '/admin/inscripciones': 'Inscripciones',
  '/admin/personas': 'Personas',
  '/admin/programas': 'Programas',
  '/admin/calendario': 'Calendario',
  '/admin/comunicacion': 'Comunicación',
  '/admin/formularios': 'Formulario y Encuestas',
  '/admin/configuracion': 'Configuración Web',
  '/admin/auditoria': 'Auditoría',
};

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname() || '/admin/actividad';
  const searchParams = useSearchParams();
  const { role, user, isLoading: isLoadingAuth } = useAuth();
  const userEmail = user?.email || '';
  const isAdmin = role === 'admin' || role === 'sysadmin' || role === 'super_admin';
  const isSuper = role === 'sysadmin' || role === 'super_admin';

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [pendingAdmissions, setPendingAdmissions] = useState(0);
  const [unreadActivity, setUnreadActivity] = useState(0);

  // Search lives in URL (?q=) so individual sections can read it.
  const queryParam = searchParams?.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(queryParam);
  useEffect(() => { setSearchInput(queryParam); }, [queryParam]);

  const pushSearch = useCallback((value: string) => {
    const sp = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (value) sp.set('q', value); else sp.delete('q');
    const qs = sp.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`);
  }, [pathname, router, searchParams]);

  // Debounced URL sync
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== queryParam) pushSearch(searchInput);
    }, 250);
    return () => clearTimeout(handle);
  }, [searchInput, queryParam, pushSearch]);

  // ─── Badge counts ─────────────────────────────────────────────────────────
  const refreshPendingAdmissions = useCallback(async () => {
    try {
      const { count } = await restSelect('form_submissions', {
        filters: { status: 'eq.pending', is_deleted: 'eq.false' },
        count: 'exact',
        head: true,
      });
      if (count !== null) setPendingAdmissions(count);
    } catch (err) {
      console.warn('[AdminShell] pendingAdmissions refresh failed', err);
    }
  }, []);

  const refreshUnreadActivity = useCallback(async () => {
    try {
      const count = await restRpc<number>('staff_activity_unread_count');
      setUnreadActivity(typeof count === 'number' ? count : Number(count) || 0);
    } catch (err) {
      console.warn('[AdminShell] unreadActivity refresh failed', err);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    refreshPendingAdmissions();
    refreshUnreadActivity();

    const channelName = 'admin_shell_badges';
    supabase.getChannels().forEach(ch => {
      if (ch.topic.includes(channelName)) supabase.removeChannel(ch);
    });
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'form_submissions' }, () => refreshPendingAdmissions())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_activity_events' }, () => refreshUnreadActivity())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_activity_event_reads' }, () => refreshUnreadActivity())
      .subscribe();

    const onVisible = () => {
      if (!document.hidden) {
        refreshPendingAdmissions();
        refreshUnreadActivity();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAdmin, refreshPendingAdmissions, refreshUnreadActivity]);

  // ─── Admin avatar ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    restSelect<{ avatar_url: string | null }>('profiles', {
      columns: 'avatar_url',
      filters: { user_id: `eq.${user.id}` },
      limit: 1,
    })
      .then(({ data }) => {
        const url = data?.[0]?.avatar_url ?? null;
        setAdminAvatar(url);
      })
      .catch(err => {
        console.warn('[AdminShell] avatar fetch failed', err);
      });
  }, [user?.id]);

  // ─── Profile menu close on outside click ──────────────────────────────────
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileMenuOpen]);

  // ─── Close mobile sidebar on route change ─────────────────────────────────
  useEffect(() => { setMobileSidebarOpen(false); }, [pathname]);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); }
    catch (e) { console.error('Logout error', e); }
    finally { window.location.href = '/auth/login'; }
  };

  const badges = useMemo(() => ({
    unreadActivity,
    pendingAdmissions,
  }), [unreadActivity, pendingAdmissions]);

  const sectionTitle = useMemo(() => {
    const match = Object.keys(SECTION_TITLES).find(key => pathname.startsWith(key));
    return match ? SECTION_TITLES[match] : '';
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-screen admin-reboot-container overflow-hidden">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`formal-sidebar flex flex-col flex-shrink-0 z-40 fixed md:static inset-y-0 left-0 transform transition-transform duration-200 ease-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">HOME <span className="text-blue-500">.</span></h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-[0.2em]">Management System</p>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white"
            aria-label="Cerrar menú"
          >
            <IoCloseOutline size={22} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-1">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const badgeValue = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-[calc(100%-24px)] flex items-center gap-3 px-4 py-2.5 mx-3 rounded-sm text-sm font-medium transition-all group ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className="truncate">{item.label}</span>
                {item.badgeKey === 'pendingAdmissions' && badgeValue > 0 && (
                  <span className="ml-auto bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {badgeValue}
                  </span>
                )}
                {item.badgeKey === 'unreadActivity' && badgeValue > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none animate-pulse">
                    {badgeValue > 99 ? '99+' : badgeValue}
                  </span>
                )}
              </Link>
            );
          })}

          {isSuper && (
            <>
              <div className="px-6 py-4 mt-4 mb-2">
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-[0.2em]">Sysadmin Tools</p>
                <div className="h-px w-full bg-white/5 mt-3" />
              </div>
              {SYSADMIN_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-[calc(100%-24px)] flex items-center gap-3 px-4 py-2.5 mx-3 rounded-sm text-sm font-medium transition-all group ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}

          {/* Changelog link */}
          <div className="px-6 pt-6 mt-auto mb-2">
            <div className="h-px w-full bg-white/5 mb-4" />
            <Link
              href="/admin/novedades"
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm font-medium transition-all group ${
                isActive('/admin/novedades')
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <IoSparklesOutline className={`w-4 h-4 flex-shrink-0 ${isActive('/admin/novedades') ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
              <span className="truncate">Novedades</span>
              <span className="ml-auto text-[9px] font-black text-slate-500 group-hover:text-slate-300">
                v{CHANGELOG[0].version}
              </span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10 gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
            aria-label="Abrir menú"
          >
            <IoMenuOutline size={24} />
          </button>

          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="formal-search-container max-w-sm hidden sm:flex relative">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar en esta sección..."
                className="formal-search-input pr-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  aria-label="Limpiar"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
                ← Web principal
              </Link>
              <div className="w-px h-4 bg-slate-200" />
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <svg className="w-3.5 h-3.5 text-[#00A9CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ir al campus
              </Link>
            </div>

            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setProfileMenuOpen(v => !v)}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 active:bg-slate-200 rounded-xl px-2 py-1.5 transition-all ring-1 ring-transparent hover:ring-slate-200"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-900 leading-none truncate max-w-[160px]">{userEmail || 'Admin'}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase mt-1 ${
                    isSuper ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isSuper ? 'Sysadmin' : 'Admin'}
                  </span>
                </div>
                {adminAvatar ? (
                  <img
                    src={adminAvatar}
                    alt={userEmail || 'Admin'}
                    className="w-9 h-9 rounded-xl object-cover shadow-sm ring-2 ring-slate-700"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white text-sm font-bold shadow-sm uppercase ring-2 ring-slate-700">
                    {(userEmail || 'Admin').substring(0, 2).toUpperCase()}
                  </div>
                )}
                <IoChevronDownOutline size={13} className={`text-slate-400 transition-transform duration-150 ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900 truncate">{userEmail || 'Admin'}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isSuper ? 'text-blue-600' : 'text-slate-500'}`}>
                      {isSuper ? 'Sysadmin' : 'Admin'}
                    </p>
                  </div>
                  <a
                    href="/perfil"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Editar perfil
                  </a>
                  <Link
                    href="/admin/novedades"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <IoSparklesOutline className="w-4 h-4 text-slate-400" />
                    <span className="flex-1">Novedades</span>
                    <span className="text-[10px] font-black text-slate-400">v{CHANGELOG[0].version}</span>
                  </Link>
                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogoutIcon className="w-4 h-4 text-red-400" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 md:p-10">
          <div className="max-w-7xl mx-auto pb-20">
            {sectionTitle && (
              <div className="mb-6 md:mb-10">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">{sectionTitle}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-400 font-medium">Dashboard</span>
                  <span className="text-xs text-slate-300">/</span>
                  <span className="text-xs text-blue-600 font-bold">{sectionTitle}</span>
                </div>
              </div>
            )}

            {(isLoadingAuth || !isAdmin) ? (
              <div className="flex items-center justify-center h-64">
                {!isLoadingAuth && !isAdmin ? (
                  <div className="text-center p-8 formal-card inline-block max-w-md w-full border-t-4 border-t-amber-400">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
                    <p className="text-sm text-slate-500 mb-4">Tu cuenta no tiene permisos de administrador.</p>
                  </div>
                ) : (
                  <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                )}
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
