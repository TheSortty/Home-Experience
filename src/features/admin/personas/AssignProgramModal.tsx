'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  IoCloseOutline, IoCheckmarkOutline, IoPersonOutline,
  IoBookOutline, IoPeopleOutline, IoCalendarOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import { restSelect, restInsert, restRpc } from '../../../services/supabaseRest';
import { CYCLE_TYPE_LABELS, categorizeCycle } from './types';
import type { PersonaStudent } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AvailableCycle {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  capacity: number | null;
  enrolled_count: number | null;
  course_id: string | null;
  course_title: string | null;
}

interface AvailableCourse {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  /** Pre-existing cycle linked to this course (if any). null → will be created on enrollment. */
  cycleId: string | null;
}

type ProgramTab = 'creser' | 'campus';
type PaymentStatus = 'pending' | 'paid';

interface Props {
  student: PersonaStudent;
  onClose: () => void;
  onAssigned: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AssignProgramModal({ student, onClose, onAssigned }: Props) {
  const [tab, setTab] = useState<ProgramTab>('creser');
  const [cycles, setCycles] = useState<AvailableCycle[]>([]);
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dedup sets — by cycle (CRESER) and by course (Campus LMS)
  const enrolledCycleIds = useMemo(
    () => new Set(student.programs.map(p => p.cycleId).filter(Boolean) as string[]),
    [student.programs],
  );
  const enrolledCourseIds = useMemo(
    () => new Set(student.programs.map(p => p.courseId).filter(Boolean) as string[]),
    [student.programs],
  );

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [cyclesRes, coursesRes] = await Promise.all([
          restSelect<any>('cycles', {
            columns: 'id,name,type,start_date,end_date,status,capacity,enrolled_count,course_id,course:courses(title)',
            filters: { is_deleted: 'eq.false' },
            order: 'start_date.desc',
          }),
          restSelect<any>('courses', {
            columns: 'id,title,description,is_published',
            order: 'title.asc',
          }),
        ]);

        const cyclesData: AvailableCycle[] = (cyclesRes.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type || 'initial',
          start_date: c.start_date,
          end_date: c.end_date,
          status: c.status || 'active',
          capacity: c.capacity,
          enrolled_count: c.enrolled_count,
          course_id: c.course_id,
          course_title: c.course?.title || null,
        }));
        setCycles(cyclesData);

        // Index cycles by course_id (first match wins) so each course can reuse its cycle.
        const cycleByCourse = new Map<string, string>();
        cyclesData.forEach(c => {
          if (c.course_id && !cycleByCourse.has(c.course_id)) cycleByCourse.set(c.course_id, c.id);
        });

        const coursesData: AvailableCourse[] = (coursesRes.data || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          is_published: !!c.is_published,
          cycleId: cycleByCourse.get(c.id) || null,
        }));
        setCourses(coursesData);
      } catch (err) {
        console.error('Error fetching programs for assignment:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // CRESER tab → only CRESER cycles (initial / advanced / plan_lider), not finished.
  const visibleCycles = useMemo(() => {
    return cycles.filter(c => {
      if (categorizeCycle(c.type) !== 'creser') return false;
      if (c.status === 'finished') return false;
      return true;
    });
  }, [cycles]);

  const selectedCycle = cycles.find(c => c.id === selectedCycleId) ?? null;
  const selectedCourse = courses.find(c => c.id === selectedCourseId) ?? null;

  const hasSelection = tab === 'creser' ? !!selectedCycleId : !!selectedCourseId;
  const alreadyEnrolled = tab === 'creser'
    ? (selectedCycleId ? enrolledCycleIds.has(selectedCycleId) : false)
    : (selectedCourseId ? enrolledCourseIds.has(selectedCourseId) : false);
  const isFull = selectedCycle
    ? (selectedCycle.capacity != null && selectedCycle.enrolled_count != null && selectedCycle.enrolled_count >= selectedCycle.capacity)
    : false;
  const canSubmit = hasSelection && !alreadyEnrolled && !isSubmitting;

  const handleAssign = async () => {
    setIsSubmitting(true);
    try {
      let cycleIdToEnroll: string | null = null;
      let label: string = '';
      let isCreser = false;

      if (tab === 'creser' && selectedCycle) {
        cycleIdToEnroll = selectedCycle.id;
        label = selectedCycle.course_title || selectedCycle.name;
        isCreser = true;
      } else if (tab === 'campus' && selectedCourse) {
        label = selectedCourse.title;
        if (selectedCourse.cycleId) {
          cycleIdToEnroll = selectedCourse.cycleId;
        } else {
          // No cycle yet for this course — create a default one (Campus LMS, open-ended).
          const today = new Date().toISOString().slice(0, 10);
          const created = await restInsert<{ id: string }>('cycles', {
            name: selectedCourse.title,
            type: 'workshop',
            start_date: today,
            end_date: '2099-12-31',
            status: 'active',
            course_id: selectedCourse.id,
            capacity: null,
            enrolled_count: 0,
          });
          if (!created?.id) throw new Error('No se pudo crear el ciclo para este curso.');
          cycleIdToEnroll = created.id;
        }
      }

      if (!cycleIdToEnroll) {
        toast.error('Seleccioná un programa antes de inscribir.');
        return;
      }

      await restInsert('enrollments', {
        user_id: student.id,
        cycle_id: cycleIdToEnroll,
        status: 'active',
        payment_status: paymentStatus,
        enrolled_at: new Date().toISOString(),
      }, { returning: 'minimal' });

      if (isCreser) {
        await restRpc('increment_enrolled_count', { p_cycle_id: cycleIdToEnroll });
      }

      toast.success(`${student.name} inscripto en ${label}`);
      onAssigned();
      onClose();
    } catch (err: any) {
      toast.error('Error al inscribir: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return d; }
  };

  const switchTab = (next: ProgramTab) => {
    setTab(next);
    setSelectedCycleId(null);
    setSelectedCourseId(null);
  };

  return createPortal(
    <div className="full-screen-modal-overlay z-[80]" onClick={onClose}>
      <div
        className="formal-modal max-w-xl w-full animate-scale-in flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-6 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Asignar programa</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Inscribiendo a <span className="font-semibold text-slate-700">{student.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all">
            <IoCloseOutline className="w-5 h-5" />
          </button>
        </div>

        {/* ── Current programs (compact) ── */}
        {student.programs.length > 0 && (
          <div className="mx-6 mb-3 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Programas actuales</p>
            <div className="flex flex-wrap gap-1.5">
              {student.programs.map(p => (
                <span
                  key={p.enrollmentId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-slate-200 bg-white text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                >
                  {p.courseTitle || p.cycleName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex px-6 gap-0 border-b border-slate-100 shrink-0">
          {([
            { id: 'creser' as ProgramTab, label: 'CRESER', icon: <IoPersonOutline className="w-3.5 h-3.5" /> },
            { id: 'campus' as ProgramTab, label: 'Campus LMS', icon: <IoBookOutline className="w-3.5 h-3.5" /> },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-all ${
                tab === t.id
                  ? 'border-[#00A9CE] text-[#00A9CE]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-3" />
              Cargando programas...
            </div>
          ) : tab === 'creser' ? (
            visibleCycles.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm italic">
                No hay ciclos CRESER activos disponibles.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {visibleCycles.map(cycle => {
                  const isAlreadyIn = enrolledCycleIds.has(cycle.id);
                  const cycleIsFull = cycle.capacity != null && cycle.enrolled_count != null && cycle.enrolled_count >= cycle.capacity;
                  const isDisabled = isAlreadyIn;
                  const isSelected = selectedCycleId === cycle.id;
                  const fillPct = cycle.capacity
                    ? Math.min(100, Math.round(((cycle.enrolled_count ?? 0) / cycle.capacity) * 100))
                    : 0;

                  return (
                    <button
                      key={cycle.id}
                      onClick={() => !isDisabled && setSelectedCycleId(isSelected ? null : cycle.id)}
                      disabled={isDisabled}
                      className={`w-full text-left px-4 py-3.5 rounded-lg border transition-all ${
                        isDisabled
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#00A9CE] bg-[#00A9CE]/5 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border bg-blue-50 text-blue-700 border-blue-200">
                              CRESER {CYCLE_TYPE_LABELS[cycle.type] ?? cycle.type}
                            </span>
                            {isAlreadyIn && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                Ya inscripto
                              </span>
                            )}
                            {cycleIsFull && !isAlreadyIn && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-0.5">
                                <IoWarningOutline className="w-3 h-3" /> Completo
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {cycle.course_title || cycle.name}
                          </p>
                          {cycle.course_title && cycle.name !== cycle.course_title && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{cycle.name}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <IoCalendarOutline className="w-3 h-3" />
                              {formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}
                            </span>
                            {cycle.capacity != null && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <IoPeopleOutline className="w-3 h-3" />
                                {cycle.enrolled_count ?? 0}/{cycle.capacity}
                              </span>
                            )}
                          </div>
                          {cycle.capacity != null && cycle.capacity > 0 && (
                            <div className="mt-2 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${fillPct >= 90 ? 'bg-rose-400' : fillPct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isSelected
                            ? 'border-[#00A9CE] bg-[#00A9CE]'
                            : 'border-slate-300'
                        }`}>
                          {isSelected && <IoCheckmarkOutline className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            // Campus LMS tab → lista de cursos
            courses.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm italic">
                No hay cursos en Campus LMS. Creá uno desde Programas → Campus LMS.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {courses.map(course => {
                  const isAlreadyIn = enrolledCourseIds.has(course.id);
                  const isSelected = selectedCourseId === course.id;
                  const isDisabled = isAlreadyIn;

                  return (
                    <button
                      key={course.id}
                      onClick={() => !isDisabled && setSelectedCourseId(isSelected ? null : course.id)}
                      disabled={isDisabled}
                      className={`w-full text-left px-4 py-3.5 rounded-lg border transition-all ${
                        isDisabled
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#00A9CE] bg-[#00A9CE]/5 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border bg-teal-50 text-teal-700 border-teal-200">
                              Campus LMS
                            </span>
                            {!course.is_published && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                Borrador
                              </span>
                            )}
                            {isAlreadyIn && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                Ya inscripto
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {course.title}
                          </p>
                          {course.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{course.description}</p>
                          )}
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isSelected
                            ? 'border-[#00A9CE] bg-[#00A9CE]'
                            : 'border-slate-300'
                        }`}>
                          {isSelected && <IoCheckmarkOutline className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-6 pt-4 border-t border-slate-100 shrink-0">
          {hasSelection && !alreadyEnrolled && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Estado de pago</p>
              <div className="flex gap-2">
                {([
                  { value: 'pending', label: 'Pendiente', color: 'border-amber-200 bg-amber-50 text-amber-700' },
                  { value: 'paid',    label: 'Pagado',    color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPaymentStatus(opt.value)}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-sm border transition-all ${
                      paymentStatus === opt.value
                        ? opt.color
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleAssign}
              disabled={!canSubmit}
              className="flex-1 py-3 bg-[#00A9CE] text-white font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-[#0097bb] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#00A9CE]/20"
            >
              {isSubmitting ? 'Inscribiendo...' : 'Confirmar inscripción'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
