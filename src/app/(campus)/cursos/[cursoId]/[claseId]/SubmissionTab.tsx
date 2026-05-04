'use client';

import { useRef, useState, useTransition } from 'react';
import {
  IoCloudUploadOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline,
  IoTimeOutline,
  IoDocumentOutline,
  IoRefreshOutline,
} from 'react-icons/io5';
import { submitLesson, getSubmissionDownloadUrl } from '../../actions';

export interface SubmissionData {
  requiresSubmission: boolean;
  dueDate: string | null;
  isOverdue: boolean;
  daysRemaining: number | null;
  latestSubmission: {
    id: string;
    file_name: string;
    submitted_at: string;
    is_late: boolean;
    version: number;
  } | null;
  latestReview: {
    feedback_text: string | null;
    revised_file_name: string | null;
    revised_storage_path: string | null;
    reviewed_at: string;
    submission_id: string;
  } | null;
}

interface Props {
  lessonId: string;
  courseId: string;
  data: SubmissionData;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SubmissionTab({ lessonId, courseId, data }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string } | null>(null);
  const [submission, setSubmission] = useState(data.latestSubmission);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!data.requiresSubmission) {
    return (
      <div className="text-center py-12 text-slate-400 italic text-sm">
        Esta clase no requiere entrega.
      </div>
    );
  }

  const handleUpload = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setFeedback({ err: 'Seleccioná un archivo primero' }); return; }
    setFeedback(null);

    const fd = new FormData();
    fd.append('lessonId', lessonId);
    fd.append('courseId', courseId);
    fd.append('file', file);

    startTransition(async () => {
      const res = await submitLesson(fd);
      if (res.error) {
        setFeedback({ err: res.error });
      } else {
        setFeedback({ ok: `Entrega ${res.version ? `v${res.version}` : ''} enviada correctamente.` });
        setSubmission({
          id: 'pending-refresh',
          file_name: file.name,
          submitted_at: new Date().toISOString(),
          is_late: data.isOverdue,
          version: res.version ?? 1,
        });
        if (fileRef.current) fileRef.current.value = '';
      }
    });
  };

  const handleDownload = async (submissionId: string) => {
    setDownloadingId(submissionId);
    const res = await getSubmissionDownloadUrl(submissionId);
    setDownloadingId(null);
    if (res.url) {
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } else {
      setFeedback({ err: res.error ?? 'No se pudo descargar' });
    }
  };

  return (
    <div className="space-y-6">

      {/* Due date / overdue banner */}
      {data.dueDate && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
          data.isOverdue
            ? 'bg-red-50 border border-red-200 text-red-700'
            : data.daysRemaining !== null && data.daysRemaining <= 3
            ? 'bg-amber-50 border border-amber-200 text-amber-700'
            : 'bg-slate-50 border border-slate-200 text-slate-600'
        }`}>
          {data.isOverdue ? (
            <><IoAlertCircleOutline size={18} className="shrink-0" />
              <span>Esta entrega está <strong>atrasada</strong>. Vencía el {formatDate(data.dueDate)}.</span></>
          ) : (
            <><IoTimeOutline size={18} className="shrink-0" />
              <span>Fecha límite: <strong>{formatDate(data.dueDate)}</strong>
                {data.daysRemaining !== null && ` · ${data.daysRemaining} día${data.daysRemaining !== 1 ? 's' : ''} restante${data.daysRemaining !== 1 ? 's' : ''}`}
              </span></>
          )}
        </div>
      )}

      {/* Current submission */}
      {submission && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-4">
          <IoCheckmarkCircle size={22} className="text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">Entrega v{submission.version} recibida</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{submission.file_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatDate(submission.submitted_at)}
              {submission.is_late && <span className="ml-2 text-red-500 font-bold">ATRASADA</span>}
            </p>
          </div>
          {submission.id !== 'pending-refresh' && (
            <button
              onClick={() => handleDownload(submission!.id)}
              disabled={downloadingId === submission.id}
              className="text-xs font-bold text-[#00A9CE] hover:text-blue-700 shrink-0 flex items-center gap-1 disabled:opacity-50"
            >
              <IoDocumentOutline size={14} />
              {downloadingId === submission.id ? 'Cargando…' : 'Ver'}
            </button>
          )}
        </div>
      )}

      {/* Admin review */}
      {data.latestReview && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Devolución del equipo · {formatDate(data.latestReview.reviewed_at)}
          </p>
          {data.latestReview.feedback_text && (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {data.latestReview.feedback_text}
            </p>
          )}
          {data.latestReview.revised_file_name && (
            <button
              onClick={() => handleDownload(data.latestReview!.submission_id)}
              className="flex items-center gap-2 text-sm font-bold text-[#00A9CE] hover:text-blue-700"
            >
              <IoDocumentOutline size={16} />
              Descargar archivo revisado: {data.latestReview.revised_file_name}
            </button>
          )}
        </div>
      )}

      {/* Upload form */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-slate-700">
          {submission ? (
            <span className="flex items-center gap-2">
              <IoRefreshOutline size={16} /> Reenviar entrega
            </span>
          ) : (
            'Subir entrega'
          )}
        </p>

        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-[#00A9CE]/50 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <IoCloudUploadOutline size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-500">
            {fileRef.current?.files?.[0]?.name ?? 'Hacé clic para seleccionar un archivo'}
          </p>
          <p className="text-xs text-slate-400 mt-1">PDF, Word, imagen · máx 50 MB</p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.ppt,.pptx,.txt"
            onChange={() => setFeedback(null)}
          />
        </div>

        {feedback?.err && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <IoAlertCircleOutline size={16} /> {feedback.err}
          </p>
        )}
        {feedback?.ok && (
          <p className="text-sm text-emerald-600 flex items-center gap-1.5">
            <IoCheckmarkCircle size={16} /> {feedback.ok}
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={isPending}
          className="w-full py-3 bg-[#00A9CE] text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
        >
          <IoCloudUploadOutline size={18} />
          {isPending ? 'Subiendo…' : 'Enviar entrega'}
        </button>
      </div>
    </div>
  );
}
