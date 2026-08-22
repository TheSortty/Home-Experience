'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  IoCloseOutline, IoCheckmarkOutline, IoCalendarOutline,
  IoPeopleOutline, IoWarningOutline, IoArrowForwardOutline,
} from 'react-icons/io5';
import { restSelect, restRpc } from '../../../services/supabaseRest';
import { CYCLE_TYPE_LABELS, categorizeCycle } from './types';
import type { PersonaStudent, ProgramChipData } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TargetCycle {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  capacity: number | null;
  enrolled_count: number | null;
  course_title: string | null;
}

/** Respuesta de preview_enrollment_move(). */
interface MovePreview {
  ok: boolean;
  blocker: string | null;
  source_cycle_name?: string;
  target_cycle_name?: string;
  type_changes?: boolean;
  attendance_to_discard?: number;
  target_is_full?: boolean;
  target_capacity?: number | null;
  target_enrolled_count?: number;
}

interface Props {
  student: PersonaStudent;
  /** La inscripción CRESER que se está moviendo. */
  program: ProgramChipData;
  onClose: () => void;
  onMoved: () => void;
}

/** Motivos por los que el backend rechaza el movimiento, en castellano. */
const BLOCKER_LABELS: Record<string, string> = {
  enrollment_not_found:      'La inscripción ya no existe. Recargá la lista.',
  target_not_found:          'La camada destino no existe o fue eliminada.',
  same_cycle:                'Ya está en esa camada.',
  target_not_creser:         'La camada destino no es de CRESER.',
  source_not_creser:         'Esta inscripción no es de CRESER — se mueve desde Campus LMS.',
  already_enrolled_in_target: 'Ya tiene otra inscripción en esa camada. Desvinculá una de las dos primero.',
  target_full:               'La camada destino está completa. Marcá "inscribir igual" para continuar.',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MoveCycleModal({ student, program, onClose, onMoved }: Props) {
  const [cycles, setCycles] = useState<TargetCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [preview, setPreview] = useState<MovePreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [allowOverbook, setAllowOverbook] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const originLabel = program.courseTitle || program.cycleName;

  // Camadas CRESER candidatas: todas menos la actual (incluye las terminadas,
  // porque una carga mal hecha puede tener que volver a una camada ya cerrada).
  useEffect(() => {
    const fetchCycles = async () => {
      setIsLoading(true);
      try {
        const { data } = await restSelect<any>('cycles', {
          columns: 'id,name,type,start_date,end_date,status,capacity,enrolled_count,course:courses(title)',
          filters: { is_deleted: 'eq.false' },
          order: 'start_date.desc',
        });
        const mapped: TargetCycle[] = (data || [])
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type || 'initial',
            start_date: c.start_date,
            end_date: c.end_date,
            status: c.status || 'active',
            capacity: c.capacity,
            enrolled_count: c.enrolled_count,
            course_title: c.course?.title || null,
          }))
          .filter((c: TargetCycle) => categorizeCycle(c.type) === 'creser' && c.id !== program.cycleId);
        setCycles(mapped);
      } catch (err) {
        console.error('Error cargando camadas destino:', err);
        toast.error('No se pudieron cargar las camadas.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCycles();
  }, [program.cycleId]);

  // Cada vez que cambia el destino le preguntamos al backend qué pasaría.
  useEffect(() => {
    if (!targetId) { setPreview(null); setAllowOverbook(false); return; }
    let cancelled = false;
    const run = async () => {
      setIsPreviewing(true);
      try {
        const res = await restRpc<MovePreview>('preview_enrollment_move', {
          p_enrollment_id: program.enrollmentId,
          p_target_cycle_id: targetId,
        });
        if (!cancelled) { setPreview(res); setAllowOverbook(false); }
      } catch (err: any) {
        if (!cancelled) {
          console.error('preview_enrollment_move falló:', err);
          setPreview({ ok: false, blocker: 'preview_failed' });
        }
      } finally {
        if (!cancelled) setIsPreviewing(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [targetId, program.enrollmentId]);

  const targetCycle = useMemo(
    () => cycles.find(c => c.id === targetId) ?? null,
    [cycles, targetId],
  );

  const blockedByCapacity = !!preview?.ok && !!preview.target_is_full && !allowOverbook;
  const canSubmit = !!targetId && !!preview?.ok && !blockedByCapacity && !isPreviewing && !isSubmitting;

  const handleMove = async () => {
    if (!targetId) return;
    setIsSubmitting(true);
    try {
      const res = await restRpc<any>('move_enrollment_to_cycle', {
        p_enrollment_id: program.enrollmentId,
        p_target_cycle_id: targetId,
        p_allow_overbook: allowOverbook,
        p_reason: reason.trim() || null,
      });

      if (!res?.success) {
        const key = res?.error as string | undefined;
        toast.error(key && BLOCKER_LABELS[key] ? BLOCKER_LABELS[key] : `No se pudo mover: ${key || 'error desconocido'}`);
        return;
      }

      const discarded = res.attendance_discarded ?? 0;
      toast.success(
        `${student.name}: ${res.from_cycle_name} → ${res.to_cycle_name}` +
        (discarded > 0 ? ` · ${discarded} asistencia${discarded !== 1 ? 's' : ''} descartada${discarded !== 1 ? 's' : ''}` : ''),
      );
      onMoved();
      onClose();
    } catch (err: any) {
      toast.error('Error al mover: ' + err.message);
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

  return createPortal(
    <div className="full-screen-modal-overlay z-[80]" onClick={onClose}>
      <div
        className="formal-modal max-w-xl w-full animate-scale-in flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-6 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Mover de camada</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              <span className="font-semibold text-slate-700">{student.name}</span> — CRESER
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all">
            <IoCloseOutline className="w-5 h-5" />
          </button>
        </div>

        {/* ── Origen → destino ── */}
        <div className="mx-6 mb-3 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100 shrink-0 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Camada actual</p>
            <p className="text-sm font-bold text-slate-800 truncate">{originLabel}</p>
          </div>
          <IoArrowForwardOutline className="w-4 h-4 text-slate-300 shrink-0" />
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Nueva camada</p>
            <p className={`text-sm font-bold truncate ${targetCycle ? 'text-[#00A9CE]' : 'text-slate-300 italic font-medium'}`}>
              {targetCycle ? (targetCycle.course_title || targetCycle.name) : 'Sin elegir'}
            </p>
          </div>
        </div>

        {/* ── Qué se conserva ── */}
        <div className="mx-6 mb-3 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100 shrink-0">
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            Se conservan <strong>pagos, notas del staff, metas y entregas</strong>. Se descarta la
            asistencia registrada en las jornadas de la camada de origen.
          </p>
        </div>

        {/* ── Lista de camadas ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-3" />
              Cargando camadas...
            </div>
          ) : cycles.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm italic">
              No hay otra camada CRESER a la que mover esta inscripción.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cycles.map(cycle => {
                const isSelected = targetId === cycle.id;
                const cycleIsFull = cycle.capacity != null && cycle.enrolled_count != null && cycle.enrolled_count >= cycle.capacity;
                const fillPct = cycle.capacity
                  ? Math.min(100, Math.round(((cycle.enrolled_count ?? 0) / cycle.capacity) * 100))
                  : 0;

                return (
                  <button
                    key={cycle.id}
                    onClick={() => setTargetId(isSelected ? null : cycle.id)}
                    className={`w-full text-left px-4 py-3.5 rounded-lg border transition-all ${
                      isSelected
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
                          {cycle.status === 'finished' && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                              Finalizada
                            </span>
                          )}
                          {cycleIsFull && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-0.5">
                              <IoWarningOutline className="w-3 h-3" /> Completa
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
                        isSelected ? 'border-[#00A9CE] bg-[#00A9CE]' : 'border-slate-300'
                      }`}>
                        {isSelected && <IoCheckmarkOutline className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer: preview + confirmación ── */}
        <div className="p-6 pt-4 border-t border-slate-100 shrink-0">
          {isPreviewing && (
            <p className="text-[11px] text-slate-400 mb-3">Verificando el movimiento...</p>
          )}

          {/* Motivo por el que el backend rechaza */}
          {preview && !preview.ok && (
            <div className="mb-3 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-[11px] font-bold text-rose-700">
                {BLOCKER_LABELS[preview.blocker || ''] || 'No se puede mover a esa camada.'}
              </p>
            </div>
          )}

          {/* Advertencias sobre un movimiento que sí es posible */}
          {preview?.ok && (
            <div className="mb-3 flex flex-col gap-2">
              {(preview.attendance_to_discard ?? 0) > 0 && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[11px] text-amber-800">
                    Se borrarán <strong>{preview.attendance_to_discard}</strong> registro
                    {preview.attendance_to_discard !== 1 ? 's' : ''} de asistencia de {originLabel}.
                  </p>
                </div>
              )}
              {preview.type_changes && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[11px] text-amber-800">
                    Cambia el tipo de programa
                    {' '}(<strong>{CYCLE_TYPE_LABELS[program.cycleType] ?? program.cycleType}</strong>
                    {' → '}
                    <strong>{CYCLE_TYPE_LABELS[targetCycle?.type || ''] ?? targetCycle?.type}</strong>).
                    Confirmá que es lo que querés.
                  </p>
                </div>
              )}
              {preview.target_is_full && (
                <label className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowOverbook}
                    onChange={e => setAllowOverbook(e.target.checked)}
                    className="mt-0.5 accent-rose-600"
                  />
                  <span className="text-[11px] text-rose-800">
                    La camada está completa ({preview.target_enrolled_count}/{preview.target_capacity}).
                    Inscribir igual, por encima del cupo.
                  </span>
                </label>
              )}
            </div>
          )}

          {preview?.ok && (
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Motivo <span className="font-medium normal-case tracking-normal text-slate-400">(opcional, queda en auditoría)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ej: error de carga, iba en la 55"
                maxLength={200}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30 focus:border-[#00A9CE] placeholder-slate-300"
              />
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
              onClick={handleMove}
              disabled={!canSubmit}
              className="flex-1 py-3 bg-[#00A9CE] text-white font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-[#0097bb] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#00A9CE]/20"
            >
              {isSubmitting ? 'Moviendo...' : 'Confirmar movimiento'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
