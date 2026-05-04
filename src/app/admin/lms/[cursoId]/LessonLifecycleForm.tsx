'use client';

import { useRef, useState, useTransition } from 'react';
import { IoLockClosedOutline, IoLockOpenOutline, IoCheckmarkCircle, IoAlertCircleOutline } from 'react-icons/io5';
import { updateLessonLifecycle } from '../actions';

interface Props {
  lesson: {
    id: string;
    title: string;
    order_index: number;
    status: string;
    unlock_at: string | null;
    unlocked_at: string | null;
    due_days_after_unlock: number | null;
    requires_submission: boolean;
  };
  courseId: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  unlocked: 'Desbloqueada',
};

export default function LessonLifecycleForm({ lesson, courseId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    setMsg(null);
    const fd = new FormData(formRef.current);
    fd.append('lessonId', lesson.id);
    fd.append('courseId', courseId);
    startTransition(async () => {
      const res = await updateLessonLifecycle(fd);
      if (res.error) setMsg({ err: res.error });
      else { setMsg({ ok: 'Guardado' }); setOpen(false); }
    });
  };

  const statusColor =
    lesson.status === 'unlocked'
      ? 'bg-emerald-100 text-emerald-700'
      : lesson.status === 'scheduled'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-500';

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {lesson.status === 'unlocked' ? (
            <IoLockOpenOutline size={18} className="text-emerald-500 shrink-0" />
          ) : (
            <IoLockClosedOutline size={18} className="text-slate-400 shrink-0" />
          )}
          <div>
            <p className="font-bold text-slate-900 text-sm">
              {lesson.order_index}. {lesson.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColor}`}>
                {STATUS_LABELS[lesson.status] ?? lesson.status}
              </span>
              {lesson.requires_submission && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                  Entrega
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs text-slate-400 shrink-0 ml-4">{open ? 'Cerrar' : 'Editar'}</span>
      </button>

      {open && (
        <form ref={formRef} onSubmit={handleSubmit} className="p-4 border-t border-slate-100 bg-slate-50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Estado</label>
              <select
                name="status"
                defaultValue={lesson.status}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/40"
              >
                <option value="draft">Borrador (oculto)</option>
                <option value="scheduled">Programada (bloqueada)</option>
                <option value="unlocked">Desbloqueada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Fecha de desbloqueo (opcional)
              </label>
              <input
                type="datetime-local"
                name="unlock_at"
                defaultValue={lesson.unlock_at ? lesson.unlock_at.slice(0, 16) : ''}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Días de plazo para entrega (desde desbloqueo)
              </label>
              <input
                type="number"
                name="due_days"
                min={1}
                defaultValue={lesson.due_days_after_unlock ?? ''}
                placeholder="ej: 7"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/40"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="requires_submission"
                id={`req-${lesson.id}`}
                value="1"
                defaultChecked={lesson.requires_submission}
                className="w-4 h-4 accent-[#00A9CE]"
              />
              <label htmlFor={`req-${lesson.id}`} className="text-sm font-medium text-slate-700">
                Requiere entrega del alumno
              </label>
            </div>
          </div>

          {msg?.err && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <IoAlertCircleOutline size={14} /> {msg.err}
            </p>
          )}
          {msg?.ok && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <IoCheckmarkCircle size={14} /> {msg.ok}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      )}
    </div>
  );
}
