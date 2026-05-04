'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IoHomeOutline, IoBookOutline, IoCalendarOutline,
  IoPeopleOutline, IoMenuOutline, IoCloseOutline,
} from 'react-icons/io5';

const NAV_LINKS = [
  { href: '/dashboard',  label: 'Inicio',     icon: IoHomeOutline     },
  { href: '/cursos',     label: 'Mis Cursos', icon: IoBookOutline     },
  { href: '/comunidad',  label: 'Comunidad',  icon: IoPeopleOutline   },
  { href: '/calendario', label: 'Calendario', icon: IoCalendarOutline },
];

export default function CampusNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop horizontal nav */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? 'text-slate-900 bg-slate-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
        aria-label="Abrir menú"
      >
        <IoMenuOutline size={24} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <aside className="flex flex-col w-72 max-w-[85vw] h-full bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <span className="text-xl font-black tracking-tighter text-[#00A9CE]">
                HOME<span className="text-slate-900">.</span>
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 transition-colors"
                aria-label="Cerrar menú"
              >
                <IoCloseOutline size={24} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                    isActive(href)
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          </aside>
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}
    </>
  );
}
