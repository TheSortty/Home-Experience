'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IoGridOutline,
  IoListOutline,
  IoPeopleOutline,
  IoSchoolOutline,
  IoBookOutline,
  IoPersonOutline,
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
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('q') ?? '';

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
      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Personas</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {TABS.find(t => t.id === activeTab)?.description}
          </p>
        </div>

        {/* View toggle (only for student tabs; coaches has its own internal toggle) */}
        {isStudentTab && (
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
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

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-0 px-6 pt-4 border-b border-slate-100 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider
              border-b-2 -mb-px transition-all
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
