'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IoGridOutline,
  IoListOutline,
  IoPeopleOutline,
  IoSchoolOutline,
  IoBookOutline,
  IoPersonOutline,
  IoCloudUploadOutline,
  IoSearchOutline,
  IoCloseOutline,
} from 'react-icons/io5';
import PersonasStudentsView from './PersonasStudentsView';
import PersonasCoachesView from './PersonasCoachesView';

type Tab = 'all' | 'creser' | 'campus' | 'coaches';
type ViewMode = 'table' | 'grid';

const VIEW_KEY = 'admin_personas_view_mode';

const TABS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'all',
    label: 'Todos',
    icon: <IoPeopleOutline className="w-4 h-4" />,
    description: 'Todos los alumnos de la formación',
  },
  {
    id: 'creser',
    label: 'CRESER',
    icon: <IoPersonOutline className="w-4 h-4" />,
    description: 'Alumnos de los ciclos presenciales',
  },
  {
    id: 'campus',
    label: 'Campus LMS',
    icon: <IoBookOutline className="w-4 h-4" />,
    description: 'Alumnos de cursos digitales',
  },
  {
    id: 'coaches',
    label: 'Coaches',
    icon: <IoSchoolOutline className="w-4 h-4" />,
    description: 'Equipo de formadores',
  },
];

interface Props {
  role: 'admin' | 'sysadmin';
}

export default function AdminPersonas({ role }: Props) {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced: each keystroke would otherwise fire a fresh server query.
  useEffect(() => {
    const handle = setTimeout(() => setSearchTerm(searchInput.trim()), 250);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Restore persisted view preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'grid' || saved === 'table') setViewMode(saved);
    } catch {}
  }, []);

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_KEY, mode); } catch {}
  };

  const isStudentTab = activeTab !== 'coaches';

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* ── Pestañas + herramientas, en una sola fila ───────────────────────
          El título salió al header del shell y la bajada repetía lo que ya
          dice la pestaña activa, así que la barra sube y ocupa ese lugar. */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 px-6 pt-4 border-b border-slate-100 shrink-0">
        <div className="flex items-end gap-0 -mb-px overflow-x-auto hide-scrollbar order-2 lg:order-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider
                border-b-2 transition-all flex-shrink-0 whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-[#00A9CE] text-[#00A9CE]'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap pb-2 order-1 lg:order-2">
          <div className="relative w-full sm:w-56 flex-shrink-0">
            <IoSearchOutline size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o DNI..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30 focus:border-[#00A9CE]/40"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <IoCloseOutline size={14} />
              </button>
            )}
          </div>

          <Link
            href="/admin/personas/importar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex-shrink-0 whitespace-nowrap"
          >
            <IoCloudUploadOutline className="w-4 h-4" />
            Importar histórico
          </Link>

          {/* View toggle (only for student tabs; coaches has its own internal toggle) */}
          {isStudentTab && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => switchView('table')}
                title="Vista tabla"
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <IoListOutline className="w-4 h-4" />
              </button>
              <button
                onClick={() => switchView('grid')}
                title="Vista mosaico"
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <IoGridOutline className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden p-6 pt-5">
        {isStudentTab ? (
          <PersonasStudentsView
            key={activeTab}
            scope={activeTab as 'all' | 'creser' | 'campus'}
            viewMode={viewMode}
            searchTerm={searchTerm}
            role={role}
          />
        ) : (
          <PersonasCoachesView
            viewMode={viewMode}
            searchTerm={searchTerm}
          />
        )}
      </div>
    </div>
  );
}
