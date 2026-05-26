'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  IoAddOutline, IoCalendarOutline, IoPeopleOutline, IoBookOutline,
  IoSchoolOutline, IoChevronForwardOutline, IoTrashOutline,
  IoArrowBackCircleOutline, IoCheckmarkCircleOutline, IoTimeOutline,
  IoEllipsisHorizontalOutline,
} from 'react-icons/io5';
import { supabase } from '../../../services/supabaseClient';
import { restSelect, restInsert, restUpdate, restDelete, getCurrentUserId } from '../../../services/supabaseRest';
import AdminCourses from '../../dashboard/admin/AdminCourses';
import { CYCLE_TYPE_LABELS, categorizeCycle } from '../personas/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Cycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'finished';
  type: string;
  capacity: number | null;
  enrolled_count: number | null;
  is_deleted?: boolean;
}

type ProgramTab = 'creser' | 'campus';

const CRESER_TYPES = ['initial', 'advanced', 'plan_lider'];
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  initial:    { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  advanced:   { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  plan_lider: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminProgramas() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchTerm = searchParams.get('q') ?? '';
  const tabParam = searchParams.get('tab') as ProgramTab | null;
  const [activeTab, setActiveTab] = useState<ProgramTab>(tabParam === 'campus' ? 'campus' : 'creser');

  const switchTab = (tab: ProgramTab) => {
    setActiveTab(tab);
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', tab);
    router.replace(`?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-0 shrink-0">
        <h1 className="text-xl font-bold text-slate-900">Programas</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {activeTab === 'creser' ? 'Ciclos presenciales CRESER' : 'Cursos del Campus Digital'}
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-end gap-0 px-6 pt-4 border-b border-slate-100 shrink-0">
        {([
          { id: 'creser' as ProgramTab, label: 'CRESER', icon: <IoSchoolOutline className="w-4 h-4" /> },
          { id: 'campus' as ProgramTab, label: 'Campus LMS', icon: <IoBookOutline className="w-4 h-4" /> },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
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

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'creser' ? (
          <CresertCyclesView searchTerm={searchTerm} />
        ) : (
          <div className="h-full overflow-auto">
            <AdminCourses />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CRESER Cycles View ──────────────────────────────────────────────────────

function CresertCyclesView({ searchTerm }: { searchTerm: string }) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [trashMode, setTrashMode] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const [cycleToDelete, setCycleToDelete] = useState<Cycle | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLoadedOnce = useRef(false);

  const fetchTrashCount = useCallback(async () => {
    try {
      const { count } = await restSelect('cycles', {
        filters: { is_deleted: 'eq.true', type: `in.(${CRESER_TYPES.join(',')})` },
        count: 'exact',
        head: true,
      });
      if (count !== null) setTrashCount(count);
    } catch {}
  }, []);

  const fetchCycles = useCallback(async (bg = false) => {
    if (!hasLoadedOnce.current && !bg) setIsLoading(true);
    try {
      const { data } = await restSelect<Cycle>('cycles', {
        filters: {
          is_deleted: `eq.${trashMode}`,
          type: `in.(${CRESER_TYPES.join(',')})`,
        },
        order: 'start_date.desc',
      });
      if (data) { setCycles(data); hasLoadedOnce.current = true; }
    } catch (err) {
      console.error('Error fetching cycles:', err);
    } finally {
      setIsLoading(false);
      fetchTrashCount();
    }
  }, [trashMode, fetchTrashCount]);

  useEffect(() => {
    fetchCycles();
    const ch = supabase.channel(`programas_creser_${trashMode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cycles' }, () => fetchCycles(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => fetchCycles(true))
      .subscribe();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchCycles(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { supabase.removeChannel(ch); document.removeEventListener('visibilitychange', onVisible); };
  }, [trashMode, fetchCycles]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setIsCreateOpen(false); setIsConfirmDeleteOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleCreate = async (data: {
    name: string; type: string; startDate: string; endDate: string; capacity: number;
  }) => {
    setIsSubmitting(true);
    try {
      await restInsert('cycles', {
        name: data.name,
        type: data.type,
        start_date: data.startDate,
        end_date: data.endDate,
        capacity: data.capacity,
        status: 'active',
        enrolled_count: 0,
      }, { returning: 'minimal' });
      toast.success('Ciclo creado correctamente');
      setIsCreateOpen(false);
      fetchCycles(true);
    } catch (err: any) {
      toast.error('Error al crear ciclo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    try {
      const userId = getCurrentUserId();
      await restUpdate('cycles', {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      }, { id: `eq.${id}` });
      setCycles(prev => prev.filter(c => c.id !== id));
      fetchTrashCount();
      toast.success('Movido a papelera');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restUpdate('cycles', { is_deleted: false, deleted_at: null, deleted_by: null }, { id: `eq.${id}` });
      setCycles(prev => prev.filter(c => c.id !== id));
      fetchTrashCount();
      toast.success('Ciclo restaurado');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handlePermanentDelete = async () => {
    if (!cycleToDelete) return;
    setIsSubmitting(true);
    try {
      await restDelete('cycles', { id: `eq.${cycleToDelete.id}` });
      setCycles(prev => prev.filter(c => c.id !== cycleToDelete.id));
      setIsConfirmDeleteOpen(false);
      setCycleToDelete(null);
      toast.success('Eliminado definitivamente');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtering
  const filtered = cycles.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (searchTerm.trim()) {
      const hay = `${c.name} ${CYCLE_TYPE_LABELS[c.type] ?? c.type}`.toLowerCase();
      if (!hay.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  // Stats
  const totalActive = cycles.filter(c => c.status === 'active').length;
  const totalStudents = cycles.reduce((acc, c) => acc + (c.enrolled_count || 0), 0);

  return (
    <div className="p-6 flex flex-col gap-6 h-full">
      {/* ── Stats row ── */}
      {!trashMode && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Ciclos activos"
            value={totalActive}
            icon={<IoCheckmarkCircleOutline className="w-5 h-5 text-emerald-500" />}
            color="text-emerald-700"
          />
          <StatCard
            label="Finalizados"
            value={cycles.filter(c => c.status === 'finished').length}
            icon={<IoTimeOutline className="w-5 h-5 text-slate-400" />}
            color="text-slate-600"
          />
          <StatCard
            label="Alumnos totales"
            value={totalStudents}
            icon={<IoPeopleOutline className="w-5 h-5 text-blue-500" />}
            color="text-blue-700"
          />
          <StatCard
            label="Ciclos históricos"
            value={cycles.length}
            icon={<IoCalendarOutline className="w-5 h-5 text-violet-500" />}
            color="text-violet-700"
          />
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold uppercase text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="finished">Finalizados</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold uppercase text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="all">Todos los tipos</option>
            {CRESER_TYPES.map(t => (
              <option key={t} value={t}>{CYCLE_TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>

          {/* Trash toggle */}
          {!trashMode ? (
            <button
              onClick={() => setTrashMode(true)}
              className="relative p-2 text-slate-300 hover:text-red-500 transition-colors"
              title="Papelera"
            >
              <IoTrashOutline className="w-4 h-4" />
              {trashCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {trashCount}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setTrashMode(false)}
              className="px-3 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-sm transition-colors uppercase tracking-wider"
            >
              ← Volver
            </button>
          )}
        </div>

        {!trashMode && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00A9CE] text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#0097bb] transition-colors shadow-sm"
          >
            <IoAddOutline className="w-4 h-4" />
            Nuevo ciclo
          </button>
        )}
      </div>

      {/* ── Cycles grid ── */}
      {isLoading && cycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Cargando ciclos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm italic">
          {trashMode ? 'La papelera está vacía.' : 'No hay ciclos que coincidan.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(cycle => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              trashMode={trashMode}
              onDelete={handleSoftDelete}
              onRestore={(c) => handleRestore(c.id)}
              onPermanentDelete={(c) => { setCycleToDelete(c); setIsConfirmDeleteOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* ── Create modal ── */}
      {isCreateOpen && createPortal(
        <div className="full-screen-modal-overlay z-[60]" onClick={() => setIsCreateOpen(false)}>
          <div className="formal-modal max-w-lg w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
            <CreateCycleForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreateOpen(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>,
        document.body
      )}

      {/* ── Confirm delete ── */}
      {isConfirmDeleteOpen && cycleToDelete && createPortal(
        <div className="full-screen-modal-overlay z-[70]" onClick={() => setIsConfirmDeleteOpen(false)}>
          <div className="formal-modal max-w-md w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <IoTrashOutline className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar definitivamente?</h3>
              <p className="text-sm text-slate-500 mb-8">
                Borrar permanentemente el ciclo <strong>{cycleToDelete.name}</strong>.
                No se puede deshacer. Los alumnos inscriptos quedarán sin ciclo.
              </p>
              <div className="flex gap-4 w-full">
                <button onClick={() => setIsConfirmDeleteOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={handlePermanentDelete} disabled={isSubmitting} className="flex-1 py-3 bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm shadow-lg shadow-red-200 hover:bg-red-700 disabled:opacity-50 transition-all">Eliminar</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Cycle Card ──────────────────────────────────────────────────────────────

function CycleCard({
  cycle, trashMode, onDelete, onRestore, onPermanentDelete,
}: {
  cycle: Cycle;
  trashMode: boolean;
  onDelete: (id: string) => void;
  onRestore: (c: Cycle) => void;
  onPermanentDelete: (c: Cycle) => void;
}) {
  const typeStyle = TYPE_COLORS[cycle.type] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
  const typeLabel = CYCLE_TYPE_LABELS[cycle.type] ?? cycle.type;
  const enrolled = cycle.enrolled_count ?? 0;
  const capacity = cycle.capacity ?? 0;
  const fillPct = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
  const isActive = cycle.status === 'active';
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div className={`bg-white border rounded-xl p-5 flex flex-col gap-4 transition-all hover:shadow-md ${
      isActive ? 'border-slate-200' : 'border-slate-100 opacity-80'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[10px] font-bold uppercase tracking-wider ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
              CRESER {typeLabel}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[10px] font-bold uppercase tracking-wider ${
              isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
              {isActive ? '● Activo' : '✓ Finalizado'}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight truncate" title={cycle.name}>
            {cycle.name}
          </h3>
        </div>

        {/* Actions menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-slate-300 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-all"
          >
            <IoEllipsisHorizontalOutline className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-10 bg-white border border-slate-200 rounded-lg shadow-lg w-40 py-1 animate-fade-in-up">
              {trashMode ? (
                <>
                  <button onClick={() => { onRestore(cycle); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <IoArrowBackCircleOutline className="w-4 h-4 text-blue-500" /> Restaurar
                  </button>
                  <button onClick={() => { onPermanentDelete(cycle); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <IoTrashOutline className="w-4 h-4" /> Eliminar
                  </button>
                </>
              ) : (
                <button onClick={() => { onDelete(cycle.id); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <IoTrashOutline className="w-4 h-4" /> Mover a papelera
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
        <IoCalendarOutline className="w-3.5 h-3.5 shrink-0" />
        <span>{formatDate(cycle.start_date)}</span>
        <span className="text-slate-200">→</span>
        <span>{formatDate(cycle.end_date)}</span>
      </div>

      {/* Enrollment fill */}
      {capacity > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <IoPeopleOutline className="w-3.5 h-3.5" /> Inscriptos
            </span>
            <span className="text-[11px] font-bold text-slate-700">
              {enrolled} / {capacity}
              <span className="text-slate-400 font-medium ml-1">({fillPct}%)</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                fillPct >= 90 ? 'bg-rose-500' : fillPct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer link to calendar */}
      {!trashMode && (
        <a
          href="/admin/calendario"
          className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-[#00A9CE] transition-colors mt-auto pt-1"
        >
          Ver en Calendario
          <IoChevronForwardOutline className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

// ─── Create Cycle Form ───────────────────────────────────────────────────────

function CreateCycleForm({
  onSubmit, onCancel, isSubmitting,
}: {
  onSubmit: (data: { name: string; type: string; startDate: string; endDate: string; capacity: number }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('initial');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capacity, setCapacity] = useState('30');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      toast.error('Completá nombre, fecha de inicio y fin');
      return;
    }
    onSubmit({ name: name.trim(), type, startDate, endDate, capacity: parseInt(capacity) || 30 });
  };

  const typeStyle = TYPE_COLORS[type] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Nuevo Ciclo CRESER</h3>
        <p className="text-xs text-slate-400 mt-0.5">Los ciclos creados acá estarán disponibles en Calendario para gestionar sesiones y asistencia.</p>
      </div>

      {/* Type selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipo de ciclo</label>
        <div className="flex gap-2 flex-wrap">
          {CRESER_TYPES.map(t => {
            const s = TYPE_COLORS[t];
            const isSelected = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-sm border text-[11px] font-bold uppercase tracking-wider transition-all ${
                  isSelected
                    ? `${s.bg} ${s.text} ${s.border} shadow-sm`
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {CYCLE_TYPE_LABELS[t] ?? t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre del ciclo</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={`Ej: CRESER ${CYCLE_TYPE_LABELS[type] ?? type} 2026`}
          className="px-4 py-3 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30 focus:border-[#00A9CE]"
          required
        />
      </div>

      {/* Dates row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inicio</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30 focus:border-[#00A9CE]"
            required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fin</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30 focus:border-[#00A9CE]"
            required />
        </div>
      </div>

      {/* Capacity */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Capacidad máxima</label>
        <input
          type="number"
          min="1"
          max="200"
          value={capacity}
          onChange={e => setCapacity(e.target.value)}
          className="px-4 py-3 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30 focus:border-[#00A9CE]"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-slate-200 transition-all">
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#00A9CE] text-white font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-[#0097bb] disabled:opacity-50 transition-all shadow-md shadow-[#00A9CE]/20">
          {isSubmitting ? 'Creando...' : 'Crear ciclo'}
        </button>
      </div>
    </form>
  );
}
