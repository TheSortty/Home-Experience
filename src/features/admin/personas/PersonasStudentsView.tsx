'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabaseClient';
import { restSelect, restUpdate, restDelete, getCurrentUserId } from '../../../services/supabaseRest';
import StudentDetailModal, { type StudentForModal, AttendanceBadge } from '../../dashboard/admin/StudentDetailModal';
import TrashIcon from '../../../ui/icons/TrashIcon';
import ProgramChip, { NoProgramChip } from './ProgramChip';
import { categorizeCycle, type PersonaStudent, type ProgramChipData, type ProgramCategory } from './types';
import AssignProgramModal from './AssignProgramModal';

type Scope = 'all' | 'creser' | 'campus';
type ViewMode = 'table' | 'grid';
type StatusFilter = 'ALL' | 'ACTIVE' | 'CONFLICT' | 'GRADUATED';

interface Props {
  scope: Scope;
  viewMode: ViewMode;
  searchTerm: string;
  role: 'admin' | 'sysadmin';
}

const VIEW_KEY = 'admin_personas_view_mode';

export default function PersonasStudentsView({ scope, viewMode, searchTerm, role }: Props) {
  const [students, setStudents] = useState<PersonaStudent[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedStudent, setSelectedStudent] = useState<StudentForModal | null>(null);
  const [trashMode, setTrashMode] = useState<'active' | 'trash'>('active');
  const [trashCount, setTrashCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<PersonaStudent | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  // Assign program modal state (1 o varios alumnos)
  const [studentsToAssign, setStudentsToAssign] = useState<PersonaStudent[] | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [studentToInvite, setStudentToInvite] = useState<PersonaStudent | null>(null);
  const [inviteMode, setInviteMode] = useState<'magic_link' | 'password'>('magic_link');
  const [invitePassword, setInvitePassword] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const fetchTrashCount = useCallback(async () => {
    try {
      const { count } = await restSelect('profiles', {
        filters: { role: 'eq.student', is_deleted: 'eq.true' },
        count: 'exact',
        head: true,
      });
      if (count !== null) setTrashCount(count);
    } catch (err) {
      console.error('Error fetching trash count:', err);
    }
  }, []);

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    const isFirstLoad = !hasLoadedOnceRef.current || !isBackgroundRefresh;
    if (isFirstLoad && students.length === 0) setIsLoading(true);

    try {
      const { data } = await restSelect<any>('profiles', {
        columns:
          'id,user_id,first_name,last_name,email,phone,avatar_url,is_deleted,' +
          'enrollments(id,status,payment_status,cycle:cycles(id,name,type,course_id,start_date,course:courses(id,title)),attendance(id,status),payments(amount,method,status,paid_at))',
        filters: {
          role: 'eq.student',
          is_deleted: `eq.${trashMode === 'trash'}`,
        },
      });

      if (!data) return;

      const emails = data.map((p: any) => p.email).filter(Boolean);
      const profileIds = data.map((p: any) => p.id);
      const cycleIds = data.flatMap((p: any) => p.enrollments?.map((e: any) => e.cycle?.id)).filter(Boolean);

      const [submissionsRes, medicalRes, sessionsRes] = await Promise.all([
        emails.length > 0
          ? restSelect<any>('form_submissions', {
              columns: 'email,data',
              filters: { email: `in.(${emails.map((e: string) => `"${e}"`).join(',')})` },
            })
          : Promise.resolve({ data: [], count: null }),
        profileIds.length > 0
          ? restSelect<any>('medical_info', { filters: { user_id: `in.(${profileIds.join(',')})` } })
          : Promise.resolve({ data: [], count: null }),
        cycleIds.length > 0
          ? restSelect<any>('cycle_sessions', { columns: 'cycle_id', filters: { cycle_id: `in.(${cycleIds.join(',')})` } })
          : Promise.resolve({ data: [], count: null }),
      ]);

      const submissionsMap = (submissionsRes.data || []).reduce((acc: any, c: any) => { acc[c.email] = c.data; return acc; }, {});
      const medicalMap = (medicalRes.data || []).reduce((acc: any, c: any) => { acc[c.user_id] = c; return acc; }, {});
      const sessionsMap = (sessionsRes.data || []).reduce((acc: any, s: any) => { acc[s.cycle_id] = (acc[s.cycle_id] || 0) + 1; return acc; }, {});

      const formatted: PersonaStudent[] = data.map((p: any) => {
        const enrollments = (p.enrollments || []) as any[];
        const programs: ProgramChipData[] = enrollments.map((e: any) => {
          const cycle = e.cycle || {};
          const course = cycle.course || null;
          const isOverdue = e.status === 'active' && e.payment_status !== 'paid';
          let derivedStatus: 'ACTIVE' | 'CONFLICT' | 'GRADUATED' = 'ACTIVE';
          if (e.status === 'conflict' || isOverdue) derivedStatus = 'CONFLICT';
          else if (e.status === 'graduated' || e.status === 'completed') derivedStatus = 'GRADUATED';

          return {
            enrollmentId: e.id,
            cycleId: cycle.id || null,
            cycleName: cycle.name || 'Sin nombre',
            cycleType: cycle.type || 'initial',
            category: categorizeCycle(cycle.type),
            status: derivedStatus,
            courseId: cycle.course_id || course?.id || null,
            courseTitle: course?.title || null,
          };
        });

        const programHistory = enrollments.map((e: any) => {
          const attCount = e.attendance?.filter((a: any) => ['present', 'late'].includes(a.status)).length || 0;
          const cId = e.cycle?.id;
          const totalSess = cId ? (sessionsMap[cId] || 0) : 0;
          const pay = e.payments?.[0];
          const startDate = e.cycle?.start_date || '9999-12-31';
          const isOverdue = e.status === 'active' && e.payment_status !== 'paid';
          let derivedStatus: 'ACTIVE' | 'CONFLICT' | 'GRADUATED' = 'ACTIVE';
          if (e.status === 'conflict' || isOverdue) derivedStatus = 'CONFLICT';
          else if (e.status === 'graduated' || e.status === 'completed') derivedStatus = 'GRADUATED';
          return {
            id: e.id,
            cycleName: e.cycle?.name || 'Desconocido',
            cycleType: e.cycle?.type || 'initial',
            status: derivedStatus,
            attendanceCount: attCount,
            totalSessions: totalSess,
            paymentInfo: pay ? {
              amount: pay.amount,
              method: pay.method === 'mercadopago' ? 'Mercado Pago' : (pay.method === 'transfer' ? 'Transferencia' : 'Efectivo'),
              status: pay.status === 'paid' ? 'Pagado' : (e.payment_status === 'paid' ? 'Pagado' : 'Pendiente'),
              paidAt: pay.paid_at ? new Date(pay.paid_at).toLocaleDateString() : '-',
            } : null,
            notes: e.notes || '',
            startDate,
          };
        }).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

        return {
          id: p.id,
          user_id: p.user_id,
          firstName: p.first_name || '',
          lastName: p.last_name || '',
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Sin nombre',
          email: p.email || '',
          phone: p.phone || submissionsMap[p.email]?.phone || '-',
          avatarUrl: p.avatar_url || null,
          programs,
          programHistory,
          formData: submissionsMap[p.email] || {},
          medicalInfo: medicalMap[p.id] || null,
          is_deleted: p.is_deleted,
        };
      });

      setStudents(formatted);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setIsLoading(false);
      fetchTrashCount();
    }
  }, [trashMode, fetchTrashCount, students.length]);

  useEffect(() => {
    fetchData();
    fetchTrashCount();

    const channelName = `personas_students_${trashMode}`;
    supabase.getChannels().forEach(ch => {
      if (ch.topic.includes(channelName)) supabase.removeChannel(ch);
    });
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => fetchData(true))
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchData(true);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [trashMode, fetchData, fetchTrashCount]);

  // Escape closes modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedStudent(null);
        setIsConfirmDeleteOpen(false);
        setIsInviteModalOpen(false);
        setStudentsToAssign(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const openInvite = (student: PersonaStudent) => {
    setStudentToInvite(student);
    setInviteMode('magic_link');
    setInvitePassword('');
    setIsInviteModalOpen(true);
  };

  const submitInvite = async () => {
    if (!studentToInvite) return;
    setIsInviting(true);
    try {
      const res = await fetch('/api/admin/create-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentToInvite.email,
          mode: inviteMode,
          password: inviteMode === 'password' ? invitePassword : null,
          firstName: studentToInvite.firstName,
          lastName: studentToInvite.lastName,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Error al crear credenciales');
      toast.success(inviteMode === 'magic_link' ? 'Magic Link enviado por email' : 'Credenciales creadas');
      setIsInviteModalOpen(false);
      fetchData(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    try {
      setIsSubmitting(true);
      const userId = getCurrentUserId();
      await restUpdate('profiles', { is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }, { id: `eq.${id}` });
      setStudents(prev => prev.filter(s => s.id !== id));
      setSelectedStudent(null);
      fetchTrashCount();
      toast.success('Movido a papelera');
    } catch (error: any) {
      toast.error('Error al borrar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      setIsSubmitting(true);
      await restUpdate('profiles', { is_deleted: false, deleted_at: null, deleted_by: null }, { id: `eq.${id}` });
      setStudents(prev => prev.filter(s => s.id !== id));
      setSelectedStudent(null);
      fetchTrashCount();
      toast.success('Restaurado');
    } catch (error: any) {
      toast.error('Error al restaurar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!studentToDelete) return;
    try {
      setIsSubmitting(true);
      await restDelete('profiles', { id: `eq.${studentToDelete.id}` });
      setStudents(prev => prev.filter(s => s.id !== studentToDelete.id));
      setIsConfirmDeleteOpen(false);
      setStudentToDelete(null);
      setSelectedStudent(null);
      toast.success('Eliminado definitivamente');
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Bulk selection + unlink ───────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // Desvincular (eliminar la inscripción) un programa de un alumno.
  const handleUnlink = async (student: PersonaStudent, program: ProgramChipData) => {
    const label = program.courseTitle || program.cycleName;
    if (!window.confirm(`¿Desvincular "${label}" de ${student.name}? Pierde el acceso a ese programa. No se puede deshacer.`)) return;
    try {
      setIsSubmitting(true);
      await restDelete('enrollments', { id: `eq.${program.enrollmentId}` });
      // No existe RPC de decremento → ajustamos el contador a mano (solo CRESER).
      if (program.category === 'creser' && program.cycleId) {
        try {
          const { data } = await restSelect<any>('cycles', {
            columns: 'enrolled_count',
            filters: { id: `eq.${program.cycleId}` },
          });
          const cur = data?.[0]?.enrolled_count ?? 0;
          await restUpdate('cycles', { enrolled_count: Math.max(0, cur - 1) }, { id: `eq.${program.cycleId}` });
        } catch { /* contador best-effort */ }
      }
      toast.success(`"${label}" desvinculado de ${student.name}`);
      fetchData(true);
    } catch (err: any) {
      toast.error('Error al desvincular: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Filtering ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return students.filter(s => {
      // Scope (CRESER / Campus / All)
      if (scope !== 'all') {
        const hasCategory = s.programs.some(p => p.category === (scope as ProgramCategory));
        if (!hasCategory) return false;
      }

      // Status filter — looks at the latest program's status
      if (statusFilter !== 'ALL') {
        const latest = s.programs[0];
        const st = latest?.status ?? 'GRADUATED';
        if (st !== statusFilter) return false;
      }

      // Search across name/email/program names
      if (term) {
        const haystack = [
          s.name,
          s.email,
          ...s.programs.map(p => `${p.cycleName} ${p.cycleType} ${p.courseTitle || ''}`),
        ].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [students, scope, statusFilter, searchTerm]);

  // ─── Selection derived ─────────────────────────────────────────────────────

  const selectedStudents = students.filter(s => selectedIds.has(s.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));
  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (filtered.every(s => next.has(s.id))) filtered.forEach(s => next.delete(s.id));
      else filtered.forEach(s => next.add(s.id));
      return next;
    });
  };

  // ─── Render helpers ──────────────────────────────────────────────────────

  const initials = (s: PersonaStudent) =>
    (s.firstName?.[0] || s.email?.[0] || '?').concat(s.lastName?.[0] || '').toUpperCase();

  const studentForModal = (s: PersonaStudent): StudentForModal => ({
    id: s.id,
    user_id: s.user_id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    programHistory: s.programHistory,
    formData: s.formData,
    medicalInfo: s.medicalInfo,
    is_deleted: s.is_deleted,
  });

  return (
    <>
      <div className="formal-card overflow-hidden animate-fade-in-up h-full flex flex-col">
        {/* Toolbar */}
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between bg-white gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base md:text-lg font-bold text-slate-800">
              {trashMode === 'trash' ? 'Papelera' : 'Alumnos'}
              <span className="ml-2 text-xs font-bold text-slate-400">({filtered.length})</span>
            </h3>
            {trashMode === 'active' ? (
              <button
                onClick={() => setTrashMode('trash')}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors relative"
                title="Papelera"
              >
                <TrashIcon className="w-4 h-4" />
                {trashCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {trashCount}
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => setTrashMode('active')}
                className="px-3 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-sm transition-colors uppercase tracking-wider"
              >
                Volver
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold uppercase text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="CONFLICT">En conflicto</option>
              <option value="GRADUATED">Graduados</option>
            </select>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 bg-violet-50 border-b border-violet-100 animate-fade-in-up">
            <span className="text-xs font-bold text-violet-700">
              {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (selectedStudents.length) setStudentsToAssign(selectedStudents); }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm"
              >
                + Asignar programa
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading && students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Cargando alumnos...</p>
            </div>
          ) : viewMode === 'table' ? (
            <TableView
              students={filtered}
              onSelect={(s) => setSelectedStudent(studentForModal(s))}
              onInvite={openInvite}
              onAssign={(s) => setStudentsToAssign([s])}
              onUnlink={handleUnlink}
              initials={initials}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
              allSelected={allFilteredSelected}
            />
          ) : (
            <GridView
              students={filtered}
              onSelect={(s) => setSelectedStudent(studentForModal(s))}
              onInvite={openInvite}
              onAssign={(s) => setStudentsToAssign([s])}
              onUnlink={handleUnlink}
              initials={initials}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}
        </div>
      </div>

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          role={role}
          onClose={() => setSelectedStudent(null)}
          onSoftDelete={handleSoftDelete}
          onRestore={handleRestore}
          onPermanentDelete={(s) => {
            const found = students.find(st => st.id === s.id);
            if (found) { setStudentToDelete(found); setIsConfirmDeleteOpen(true); }
          }}
        />
      )}

      {/* Assign program modal (single o bulk) */}
      {studentsToAssign && (
        <AssignProgramModal
          students={studentsToAssign}
          onClose={() => setStudentsToAssign(null)}
          onAssigned={() => { fetchData(true); setStudentsToAssign(null); clearSelection(); }}
        />
      )}

      {/* Confirm permanent delete */}
      {isConfirmDeleteOpen && studentToDelete && createPortal(
        <div className="full-screen-modal-overlay z-[70]" onClick={() => setIsConfirmDeleteOpen(false)}>
          <div className="formal-modal max-w-md w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><TrashIcon className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar definitivamente?</h3>
              <p className="text-sm text-slate-500 mb-8">Borrar permanentemente a <strong>{studentToDelete.name}</strong>. No se puede deshacer.</p>
              <div className="flex gap-4 w-full">
                <button onClick={() => setIsConfirmDeleteOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={handlePermanentDelete} disabled={isSubmitting} className="flex-1 py-3 bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm shadow-lg shadow-red-200 hover:bg-red-700 disabled:opacity-50 transition-all">Eliminar</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Invite modal */}
      {isInviteModalOpen && studentToInvite && createPortal(
        <div className="full-screen-modal-overlay z-[70]" onClick={() => setIsInviteModalOpen(false)}>
          <div className="formal-modal max-w-md w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Habilitar Acceso al Campus</h3>
              <p className="text-sm text-slate-500 mb-6">Vas a crear la cuenta de <strong>{studentToInvite.name}</strong> ({studentToInvite.email}).</p>
              <div className="space-y-4 mb-6">
                <label className={`flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors ${inviteMode === 'magic_link' ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-slate-50'}`}>
                  <input type="radio" name="inviteMode" checked={inviteMode === 'magic_link'} onChange={() => setInviteMode('magic_link')} className="mt-1" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Enviar enlace mágico</p>
                    <p className="text-xs text-slate-500 mt-1">El alumno recibirá un email con un botón para crear su propia contraseña.</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors ${inviteMode === 'password' ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-slate-50'}`}>
                  <input type="radio" name="inviteMode" checked={inviteMode === 'password'} onChange={() => setInviteMode('password')} className="mt-1" />
                  <div className="w-full">
                    <p className="text-sm font-bold text-slate-800">Crear contraseña manualmente</p>
                    <p className="text-xs text-slate-500 mt-1 mb-3">Vos le pasás la contraseña por privado.</p>
                    {inviteMode === 'password' && (
                      <input
                        type="text"
                        placeholder="Mínimo 6 caracteres"
                        value={invitePassword}
                        onChange={e => setInvitePassword(e.target.value)}
                        className="w-full p-2 text-sm border rounded-sm"
                      />
                    )}
                  </div>
                </label>
              </div>
              <div className="flex gap-4 w-full">
                <button onClick={() => setIsInviteModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={submitInvite} disabled={isInviting || (inviteMode === 'password' && invitePassword.length < 6)} className="flex-1 py-3 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all">
                  {isInviting ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function TableView({
  students, onSelect, onInvite, onAssign, onUnlink, initials,
  selectedIds, onToggleSelect, onToggleAll, allSelected,
}: {
  students: PersonaStudent[];
  onSelect: (s: PersonaStudent) => void;
  onInvite: (s: PersonaStudent) => void;
  onAssign: (s: PersonaStudent) => void;
  onUnlink: (s: PersonaStudent, p: ProgramChipData) => void;
  initials: (s: PersonaStudent) => string;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
}) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 italic text-sm">No se encontraron alumnos.</div>
    );
  }
  return (
    <table className="formal-table min-w-[800px]">
      <thead>
        <tr>
          <th className="w-8 text-center">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              className="w-3.5 h-3.5 accent-violet-600 cursor-pointer"
              title="Seleccionar todos"
            />
          </th>
          <th>Alumno</th>
          <th>Programas</th>
          <th className="text-center">Campus</th>
          <th className="text-center">Asistencia</th>
          <th className="text-center">Pago</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {students.map((s) => {
          const latest = s.programHistory?.[0];
          const hasConflict = s.programs.some(p => p.status === 'CONFLICT');
          const isSel = selectedIds.has(s.id);
          return (
            <tr
              key={s.id}
              className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSel ? 'bg-violet-50/60' : hasConflict ? 'bg-rose-50/40' : ''}`}
              onClick={() => onSelect(s)}
            >
              <td className="text-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => onToggleSelect(s.id)}
                  className="w-3.5 h-3.5 accent-violet-600 cursor-pointer"
                />
              </td>
              <td>
                <div className="flex items-center gap-3">
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt={s.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {initials(s)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">{s.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 group/copy">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{s.email}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(s.email); toast.success('Email copiado'); }}
                    className="opacity-0 group-hover/copy:opacity-100 p-1 hover:bg-slate-100 rounded-sm transition-all"
                    title="Copiar Email"
                  >
                    <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </button>
                </div>
                  </div>
                </div>
              </td>
              <td>
                <div className="flex flex-wrap gap-1.5 max-w-[320px]" onClick={(e) => e.stopPropagation()}>
                  {s.programs.length === 0 ? <NoProgramChip /> : s.programs.map((p) => (
                    <ProgramChip key={p.enrollmentId} program={p} onRemove={() => onUnlink(s, p)} />
                  ))}
                </div>
              </td>
              <td className="text-center">
                {s.user_id ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">✅ Acceso activo</span>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onInvite(s); }}
                    className="inline-flex items-center px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
                  >
                    + Habilitar
                  </button>
                )}
              </td>
              <td className="text-center"><AttendanceBadge count={latest?.attendanceCount || 0} total={latest?.totalSessions || 0} /></td>
              <td className="text-center">
                {latest?.paymentInfo ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${latest.paymentInfo.status === 'Pagado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {latest.paymentInfo.status === 'Pagado' ? '✅' : '⏳'} {latest.paymentInfo.status}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-300 font-bold uppercase">Sin registro</span>
                )}
              </td>
              <td className="text-center">
                <button
                  onClick={(e) => { e.stopPropagation(); onAssign(s); }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-600 hover:text-white transition-colors shadow-sm whitespace-nowrap"
                  title="Asignar programa"
                >
                  + Programa
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GridView({
  students, onSelect, onInvite, onAssign, onUnlink, initials,
  selectedIds, onToggleSelect,
}: {
  students: PersonaStudent[];
  onSelect: (s: PersonaStudent) => void;
  onInvite: (s: PersonaStudent) => void;
  onAssign: (s: PersonaStudent) => void;
  onUnlink: (s: PersonaStudent, p: ProgramChipData) => void;
  initials: (s: PersonaStudent) => string;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 italic text-sm">No se encontraron alumnos.</div>
    );
  }
  return (
    <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {students.map(s => {
        const latest = s.programHistory?.[0];
        const hasConflict = s.programs.some(p => p.status === 'CONFLICT');
        const isSel = selectedIds.has(s.id);
        return (
          <div
            key={s.id}
            onClick={() => onSelect(s)}
            className={`relative cursor-pointer text-left bg-white rounded-2xl border ${isSel ? 'border-violet-300 ring-1 ring-violet-200' : hasConflict ? 'border-rose-200' : 'border-slate-200'} hover:border-[#00A9CE]/40 hover:shadow-md transition-all p-4 flex flex-col gap-3`}
          >
            <input
              type="checkbox"
              checked={isSel}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect(s.id)}
              className="absolute top-3 right-3 w-3.5 h-3.5 accent-violet-600 cursor-pointer"
              title="Seleccionar"
            />
            <div className="flex items-start gap-3 pr-5">
              {s.avatarUrl ? (
                <img src={s.avatarUrl} alt={s.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  {initials(s)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
                <p className="text-[10px] font-medium text-slate-400 truncate uppercase tracking-wide">{s.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
              {s.programs.length === 0 ? <NoProgramChip /> : s.programs.slice(0, 4).map(p => (
                <ProgramChip key={p.enrollmentId} program={p} onRemove={() => onUnlink(s, p)} />
              ))}
              {s.programs.length > 4 && (
                <span className="text-[10px] font-bold text-slate-400 uppercase">+{s.programs.length - 4}</span>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-50 gap-2">
              {s.user_id ? (
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                  ✓ Acceso
                </span>
              ) : (
                <span
                  onClick={(e) => { e.stopPropagation(); onInvite(s); }}
                  className="text-[10px] font-bold text-blue-600 uppercase tracking-wider cursor-pointer hover:underline"
                  role="button"
                >
                  + Habilitar
                </span>
              )}
              <span
                onClick={(e) => { e.stopPropagation(); onAssign(s); }}
                className="text-[10px] font-bold text-violet-600 uppercase tracking-wider cursor-pointer hover:underline"
                role="button"
              >
                + Programa
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
