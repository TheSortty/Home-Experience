'use client';

import { useRef, useState, useTransition } from 'react';
import { IoCheckmarkCircle, IoAlertCircleOutline, IoDocumentOutline } from 'react-icons/io5';
import { submitAdminReview, getAdminSignedUrl } from '../../actions';

interface Props {
  submissionId: string;
  courseId: string;
  lessonId: string;
  existingReview: { feedback_text: string | null; revised_file_name: string | null } | null;
}

export default function ReviewForm({ submissionId, courseId, lessonId, existingReview }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.append('submissionId', submissionId);
    fd.append('courseId', courseId);
    fd.append('lessonId', lessonId);
    if (fileRef.current?.files?.[0]) fd.append('revised_file', fileRef.current.files[0]);
    setMsg(null);
    startTransition(async () => {
      const res = await submitAdminReview(fd);
      if (res.error) setMsg({ err: res.error });
      else { setMsg({ ok: 'Devolución enviada' }); setOpen(false); }
    });
  };

  const handleDownload = async (path: string) => {
    const res = await getAdminSignedUrl(path);
    if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      {existingReview && (
        <div className="text-xs text-emerald-600 font-bold mb-1 flex items-center gap-1">
          <IoCheckmarkCircle size={12} /> Revisada
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-bold text-[#00A9CE] hover:text-blue-700 transition-colors"
      >
        {existingReview ? 'Editar devolución' : 'Dar devolución'}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <textarea
            name="feedback_text"
            placeholder="Escribí tu devolución aquí…"
            defaultValue={existingReview?.feedback_text ?? ''}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/40 resize-none"
          />
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

          {msg?.err && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <IoAlertCircleOutline size={12} /> {msg.err}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Enviando…' : 'Enviar'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
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
