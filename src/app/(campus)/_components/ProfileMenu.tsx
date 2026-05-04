'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IoLogOutOutline, IoPersonOutline, IoChevronDownOutline } from 'react-icons/io5';
import { logoutAction } from '../perfil/actions';

interface Props {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  initials: string;
  avatarUrl?: string | null;
}

export default function ProfileMenu({ firstName, lastName, fullName, email, initials, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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

          <form action={logoutAction} className="border-t border-slate-100">
            <button
              type="submit"
              role="menuitem"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <IoLogOutOutline size={18} className="text-slate-400 shrink-0" />
              Salir
            </button>
          </form>

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
