'use client';

import { useRef, useState, useTransition } from 'react';
import {
  IoCheckmarkCircle, IoAlertCircleOutline, IoDocumentOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import { submitAdminReview } from '../../actions';

interface Props {
  submissionId: string;
  courseId: string;
  lessonId: string;
  existingReview: { feedback_text: string | null; revised_file_name: string | null } | null;
  isApproved?: boolean;
  onReviewSaved?: (approved: boolean) => void;
}

export default function ReviewForm({
  submissionId,
  courseId,
  lessonId,
  existingReview,
  isApproved = false,
  onReviewSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [approve, setApprove] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isApproved) {
    return (
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
        <IoShieldCheckmarkOutline size={14} /> Entrega aprobada — hilo cerrado
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.append('submissionId', submissionId);
    fd.append('courseId', courseId);
    fd.append('lessonId', lessonId);
    if (approve) fd.append('approve', '1');
    if (fileRef.current?.files?.[0]) fd.append('revised_file', fileRef.current.files[0]);
    setMsg(null);

    startTransition(async () => {
      const res = await submitAdminReview(fd);
      if (res.error) {
        setMsg({ err: res.error });
      } else {
        const wasApproved = res.approved ?? false;
        setMsg({ ok: wasApproved ? '✓ Entrega aprobada y hilo cerrado.' : 'Devolución enviada.' });
        setOpen(false);
        setApprove(false);
        onReviewSaved?.(wasApproved);
      }
    });
  };

  return (
    <div>
      {msg?.ok && (
        <p className="text-xs text-emerald-700 font-bold flex items-center gap-1 mb-2">
          <IoCheckmarkCircle size={13} /> {msg.ok}
        </p>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs font-bold text-[#00A9CE] hover:text-blue-700 transition-colors"
      >
        {existingReview ? 'Editar devolución' : '+ Dar devolución'}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Feedback para el alumno</label>
            <textarea
              name="feedback_text"
              placeholder="Escribí tu devolución acá…"
              defaultValue={existingReview?.feedback_text ?? ''}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/40 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Archivo revisado (opcional)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx"
              className="text-xs text-slate-600"
            />
            {existingReview?.revised_file_name && (
              <p className="text-xs text-slate-400 mt-1">Anterior: {existingReview.revised_file_name}</p>
            )}
          </div>

          {/* Approve checkbox */}
          <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
            approve
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-200'
          }`}>
            <input
              type="checkbox"
              checked={approve}
              onChange={e => setApprove(e.target.checked)}
              className="mt-0.5 accent-emerald-600"
            />
            <div>
              <p className="text-xs font-bold">Aprobar esta entrega</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Cierra el hilo. El alumno verá "✓ Aprobada" y no podrá subir más versiones.
              </p>
            </div>
          </label>

          {msg?.err && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <IoAlertCircleOutline size={12} /> {msg.err}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50 transition-colors ${
                approve
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-900 hover:bg-slate-700 text-white'
              }`}
            >
              {isPending ? 'Enviando…' : approve ? 'Aprobar y cerrar hilo' : 'Enviar devolución'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setApprove(false); }}
              className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
