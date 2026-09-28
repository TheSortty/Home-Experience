'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IoLogOutOutline, IoPersonOutline, IoChevronDownOutline, IoBriefcaseOutline, IoSunnyOutline, IoMoonOutline, IoDesktopOutline } from 'react-icons/io5';
import { supabase } from '@home/services/supabaseClient';
import { MARKETING_URL } from '@home/services/siteUrls';

type Theme = 'light' | 'dark' | 'system';

const THEMES: { id: Theme; label: string; Icon: typeof IoSunnyOutline }[] = [
  { id: 'light', label: 'Claro', Icon: IoSunnyOutline },
  { id: 'dark', label: 'Oscuro', Icon: IoMoonOutline },
  { id: 'system', label: 'Sistema', Icon: IoDesktopOutline },
];

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Pone o saca la clase .dark. El mismo criterio que THEME_SCRIPT en app/layout.tsx. */
function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && systemDark().matches);
  document.documentElement.classList.toggle('dark', dark);
}

function readTheme(): Theme {
  try {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch { return 'system'; }
}

interface Props {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  initials: string;
  avatarUrl?: string | null;
  /** Sólo para staff: link al panel de administración. */
  adminUrl?: string;
}

export default function ProfileMenu({ firstName, lastName, fullName, email, initials, avatarUrl, adminUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>('system');

  // Al montar: leer lo guardado y, en "Sistema", seguir al SO en vivo.
  useEffect(() => {
    setTheme(readTheme());
    const mq = systemDark();
    const onChange = () => { if (readTheme() === 'system') applyTheme('system'); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const chooseTheme = (t: Theme) => {
    setTheme(t);
    try {
      if (t === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', t);
    } catch { /* sin storage: vale solo para esta pestaña */ }
    applyTheme(t);
  };

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    // Client-side signOut clears both the browser Supabase client's in-memory
    // session AND the auth cookies. Server-action signOut leaves the browser
    // client's in-memory session intact, causing /auth/login to redirect-loop
    // back to /dashboard until F5.
    await supabase.auth.signOut();
    // El login vive en el otro Worker (siendohome.com): '/auth/login' relativo
    // caía en el campus, que no tiene esa ruta, y el middleware lo rebotaba al
    // login con ?next=<campus>/auth/login → al volver a entrar, un 404.
    window.location.href = `${MARKETING_URL}/auth/login`;
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Close when pathname changes (after navigating to /perfil)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 group rounded-full hover:bg-slate-100 pl-1 pr-2 py-1 transition-colors"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName || 'Avatar'}
            className="w-9 h-9 rounded-full object-cover shadow-sm"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-terra to-terra-soft flex items-center justify-center text-white text-sm font-medium font-serif shadow-sm">
            {initials}
          </div>
        )}
        <IoChevronDownOutline
          size={14}
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            animation: 'profile-menu-in 150ms ease-out',
          }}
          className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden"
        >
          {/* Identity header */}
          <div className="bg-cream px-4 py-3 border-b border-cream-deep">
            <p className="font-serif text-base font-medium text-ink truncate">{fullName || firstName || 'Tu cuenta'}</p>
            {email && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{email}</p>
            )}
          </div>

          {/* Items */}
          <Link
            href="/perfil"
            role="menuitem"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <IoPersonOutline size={18} className="text-terra shrink-0" />
            Tu espacio
          </Link>

          {adminUrl && (
            <a
              href={adminUrl}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <IoBriefcaseOutline size={18} className="text-terra shrink-0" />
              Ir a administración
            </a>
          )}

          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Apariencia</p>
            <div role="radiogroup" aria-label="Apariencia" className="grid grid-cols-3 gap-1 bg-slate-100 rounded-lg p-1">
              {THEMES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={theme === id}
                  onClick={() => chooseTheme(id)}
                  className={`flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                    theme === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={signingOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <IoLogOutOutline size={18} className="text-slate-400 shrink-0" />
              {signingOut ? 'Saliendo…' : 'Salir'}
            </button>
          </div>

          <style>{`
            @keyframes profile-menu-in {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
