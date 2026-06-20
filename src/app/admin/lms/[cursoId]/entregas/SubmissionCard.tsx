'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  IoCheckmarkCircle, IoAlertCircleOutline, IoOpenOutline,
  IoChevronDownOutline, IoChevronUpOutline, IoTimeOutline,
  IoChatbubbleEllipsesOutline, IoSendOutline, IoShieldCheckmarkOutline,
  IoPeopleOutline, IoDocumentOutline, IoArrowUndoOutline, IoTrashOutline,
  IoEyeOutline, IoDownloadOutline, IoRefreshOutline, IoAddCircleOutline,
} from 'react-icons/io5';
import { getReviewerThread, postReviewerChatMessage, submitAdminReview, deleteSubmission, resetStudentSubmission, setAdditionalAllowed } from '../../actions';
import { supabase } from '@/src/services/supabaseClient';
import { entregaDownloadHref, entregaPreviewHref, isPreviewable } from '@/src/services/entregaDownload';
import type { SubmissionThread, ChatMessage, SubmissionFile } from '@/src/types/submissions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubmissionSummary {
  id: string;
  file_name: string | null;
  storage_path: string | null;
  submission_url?: string | null;
  submitted_at: string;
  is_late: boolean;
  version: number;
  status: string;
  user_id: string;
  allow_additional: boolean;
  files: SubmissionFile[];
}

interface ReviewFileLite {
  id: string;
  storage_key: string;
  file_name: string;
  content_type: string | null;
}

interface ReviewSummary {
  id: string;
  feedback_text: string | null;
  revised_file_name: string | null;
  revised_storage_path: string | null;
  reviewed_at: string;
  submission_review_files?: ReviewFileLite[];
}

interface Props {
  studentProfileId: string;
  studentName: string;
  studentEmail: string;
  latestSubmission: SubmissionSummary;
  latestReview: ReviewSummary | null;
  courseId: string;
  lessonId: string;
  reviewerProfileId: string;
  isMyTeam: boolean;
  isAdmin: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'hace menos de 1h';
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d !== 1 ? 's' : ''}`;
}

function DownloadLink({ storagePath, label }: { storagePath: string; label: string }) {
  return (
    <a
      href={entregaDownloadHref(storagePath)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
    >
      <IoDocumentOutline size={13} />
      {label}
    </a>
  );
}

// A delivery file row with an inline preview toggle (PDF / image) + download.
function FileRow({
  storageKey, fileName, contentType, isAdditional, isLate,
}: {
  storageKey: string;
  fileName: string;
  contentType?: string | null;
  isAdditional?: boolean;
  isLate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canPreview = isPreviewable(fileName, contentType);
  const isImage = !/\.pdf$/i.test(fileName) && (contentType?.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(fileName));

  return (
    <div className={`bg-slate-50 border rounded-lg overflow-hidden ${isAdditional ? 'border-violet-200' : 'border-slate-100'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <IoDocumentOutline size={14} className="shrink-0 text-slate-400" />
        <span className="flex-1 min-w-0 truncate text-xs font-bold text-slate-700">{fileName}</span>
        {isAdditional && (
          <span className={`shrink-0 text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${isLate ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
            Adicional · {isLate ? 'tarde' : 'a tiempo'}
          </span>
        )}
        {canPreview && (
          <button
            onClick={() => setOpen(v => !v)}
            className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#00A9CE] hover:text-blue-700 transition-colors"
          >
            <IoEyeOutline size={13} /> {open ? 'Ocultar' : 'Ver'}
          </button>
        )}
        <a
          href={entregaDownloadHref(storageKey)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <IoDownloadOutline size={13} /> Descargar
        </a>
      </div>
      {open && canPreview && (
        <div className="border-t border-slate-200 bg-white">
          {isImage ? (
            <img src={entregaPreviewHref(storageKey)} alt={fileName} className="max-h-[480px] w-full object-contain bg-slate-100" />
          ) : (
            <iframe src={entregaPreviewHref(storageKey)} title={fileName} className="w-full h-[520px]" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline review form ───────────────────────────────────────────────────────

function InlineReviewForm({
  submissionId,
  courseId,
  lessonId,
  existingReview,
  isApproved,
  onReviewSaved,
}: {
  submissionId: string;
  courseId: string;
  lessonId: string;
  existingReview: ReviewSummary | null;
  isApproved: boolean;
  onReviewSaved: (approved: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [approve, setApprove] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (isApproved) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700">
        <IoShieldCheckmarkOutline size={16} />
        Hilo cerrado — entrega aprobada
      </div>
    );
  }

  const handleToggle = () => {
    setOpen(v => !v);
    if (!open) setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // The file input is named "revised_files" inside the form, so FormData
    // already carries every selected file — no manual append needed.
    const fd = new FormData(e.currentTarget);
    fd.append('submissionId', submissionId);
    fd.append('courseId', courseId);
    fd.append('lessonId', lessonId);
    if (approve) fd.append('approve', '1');
    setMsg(null);

    startTransition(async () => {
      const res = await submitAdminReview(fd);
      if (res.error) {
        setMsg({ err: res.error });
      } else {
        const wasApproved = res.approved ?? false;
        setMsg({ ok: wasApproved ? 'Entrega aprobada y hilo cerrado.' : 'Devolución enviada al alumno.' });
        setOpen(false);
        setApprove(false);
        setPickedFiles([]);
        onReviewSaved(wasApproved);
      }
    });
  };

  return (
    <div className="space-y-2">
      {msg?.ok && (
        <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 px-1">
          <IoCheckmarkCircle size={14} /> {msg.ok}
        </p>
      )}

      {!open ? (
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-500 hover:border-[#00A9CE] hover:text-[#00A9CE] transition-all"
        >
          <IoArrowUndoOutline size={15} />
          {existingReview ? 'Editar devolución' : 'Escribir devolución'}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <textarea
            ref={textareaRef}
            name="feedback_text"
            placeholder="Escribí tu devolución para el alumno…"
            defaultValue={existingReview?.feedback_text ?? ''}
            rows={4}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30 resize-none placeholder-slate-400"
          />

          {/* Adjuntar archivo(s) de devolución (PDF/Word/imágenes, varios permitidos) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">
              Adjuntar archivo(s) corregido(s) <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              type="file"
              name="revised_files"
              multiple
              accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={e => setPickedFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 file:cursor-pointer"
            />
            {pickedFiles.length > 0 && (
              <ul className="space-y-1 pt-0.5">
                {pickedFiles.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <IoDocumentOutline size={12} className="shrink-0 text-slate-400" />
                    <span className="truncate">{f.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
            approve
              ? 'bg-emerald-50 border-emerald-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}>
            <input
              type="checkbox"
              checked={approve}
              onChange={e => setApprove(e.target.checked)}
              className="mt-0.5 accent-emerald-600 w-4 h-4 shrink-0"
            />
            <div>
              <p className={`text-sm font-bold ${approve ? 'text-emerald-800' : 'text-slate-700'}`}>
                Aprobar y cerrar el hilo
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                El alumno verá "✓ Aprobada" y no podrá enviar más versiones.
              </p>
            </div>
          </label>

          {msg?.err && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <IoAlertCircleOutline size={13} /> {msg.err}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl disabled:opacity-50 transition-colors ${
                approve
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-900 hover:bg-slate-700 text-white'
              }`}
            >
              {isPending ? 'Enviando…' : approve ? 'Aprobar y cerrar' : 'Enviar devolución'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setApprove(false); setMsg(null); }}
              className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Chat section ─────────────────────────────────────────────────────────────

function ChatSection({
  lessonId,
  studentProfileId,
  reviewerProfileId,
}: {
  lessonId: string;
  studentProfileId: string;
  reviewerProfileId: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [body, setBody] = useState('');
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (messages !== null) return;
    setLoadingMsgs(true);
    const t = await getReviewerThread(lessonId, studentProfileId);
    setMessages(t?.chatMessages ?? []);
    setLoadingMsgs(false);
  };

  const handleToggle = () => {
    if (!open) load();
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const channelName = `coach-chat-${lessonId}-${studentProfileId}`;
    supabase.getChannels().forEach(ch => {
      if (ch.topic.includes(channelName)) supabase.removeChannel(ch);
    });
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'submission_chat_messages',
        filter: `lesson_id=eq.${lessonId}`,
      }, (payload) => {
        const row = payload.new as any;
        if (row.student_id !== studentProfileId) return;
        const isOwn = row.author_id === reviewerProfileId;
        setMessages(prev => {
          if (!prev) return [row];
          if (prev.some(m => m.id === row.id)) return prev;
          return [...prev, {
            id: row.id, lesson_id: row.lesson_id, student_id: row.student_id,
            author_id: row.author_id, body: row.body, created_at: row.created_at,
            author_name: isOwn ? 'Vos' : null,
            author_side: isOwn ? 'reviewer' : 'student',
          }];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, lessonId, studentProfileId, reviewerProfileId]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length, open]);

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`, lesson_id: lessonId, student_id: studentProfileId,
      author_id: reviewerProfileId, body: trimmed, created_at: new Date().toISOString(),
      author_name: 'Vos', author_side: 'reviewer',
    };
    setMessages(prev => [...(prev ?? []), optimistic]);
    setBody('');
    setSendErr(null);
    startTransition(async () => {
      const res = await postReviewerChatMessage(lessonId, studentProfileId, trimmed);
      if (res.error) {
        setMessages(prev => prev?.filter(m => m.id !== optimistic.id) ?? null);
        setSendErr(res.error);
      }
    });
  };

  const msgCount = messages?.length ?? 0;

  return (
    <div>
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <IoChatbubbleEllipsesOutline size={14} />
        Chat privado con el alumno
        {msgCount > 0 && (
          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black">
            {msgCount}
          </span>
        )}
        {open ? <IoChevronUpOutline size={12} /> : <IoChevronDownOutline size={12} />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loadingMsgs && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-[#00A9CE] rounded-full animate-spin" />
            </div>
          )}
          {!loadingMsgs && (
            <>
              <div className="max-h-52 overflow-y-auto space-y-2 bg-slate-50 rounded-xl p-3">
                {(messages ?? []).length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">Sin mensajes todavía.</p>
                )}
                {(messages ?? []).map(msg => {
                  const isReviewer = msg.author_side === 'reviewer';
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isReviewer ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${isReviewer ? 'bg-slate-700 text-white' : 'bg-[#00A9CE] text-white'}`}>
                        {isReviewer ? 'C' : 'A'}
                      </div>
                      <div className={`max-w-[72%] flex flex-col gap-0.5 ${isReviewer ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                          isReviewer
                            ? 'bg-slate-700 text-white rounded-tr-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                        }`}>
                          {msg.body}
                        </div>
                        <span className="text-[9px] text-slate-400 px-1">
                          {msg.author_name ?? (isReviewer ? 'Vos' : 'Alumno')} · {fmtDate(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {sendErr && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <IoAlertCircleOutline size={12} /> {sendErr}
                </p>
              )}

              <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-xl p-2 focus-within:border-[#00A9CE] focus-within:ring-2 focus-within:ring-[#00A9CE]/20 transition-all">
                <textarea
                  rows={2}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Mensaje privado… (Enter para enviar)"
                  className="flex-1 text-xs text-slate-700 placeholder-slate-400 resize-none outline-none bg-transparent leading-relaxed"
                />
                <button
                  onClick={handleSend}
                  disabled={isPending || !body.trim()}
                  className="shrink-0 w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center hover:bg-slate-900 transition-colors disabled:opacity-40"
                >
                  <IoSendOutline size={13} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export default function SubmissionCard({
  studentProfileId,
  studentName,
  studentEmail,
  latestSubmission,
  latestReview,
  courseId,
  lessonId,
  reviewerProfileId,
  isMyTeam,
  isAdmin,
}: Props) {
  const [currentStatus, setCurrentStatus] = useState(latestSubmission.status);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SubmissionThread | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [didReset, setDidReset] = useState(false);
  const [allowAdditional, setAllowAdditional] = useState(latestSubmission.allow_additional);
  const [togglingAdd, setTogglingAdd] = useState(false);

  const handleToggleAdditional = async () => {
    const next = !allowAdditional;
    setTogglingAdd(true);
    const res = await setAdditionalAllowed(latestSubmission.id, courseId, next);
    setTogglingAdd(false);
    if (!res.error) setAllowAdditional(next);
  };

  const handleDelete = async () => {
    if (!confirm(`¿Borrar la entrega de ${studentName}? Se eliminan todos sus archivos de R2 y no se puede deshacer.`)) return;
    setDeleting(true);
    setDeleteErr(null);
    const res = await deleteSubmission(latestSubmission.id, courseId);
    setDeleting(false);
    if (res.error) setDeleteErr(res.error);
    else setDeleted(true);
  };

  const handleReset = async () => {
    if (!confirm(`¿Reiniciar la entrega de ${studentName}? Se borran TODAS sus versiones, devoluciones y chat de esta clase para que pueda entregar de cero. No se puede deshacer.`)) return;
    setResetting(true);
    setDeleteErr(null);
    const res = await resetStudentSubmission(studentProfileId, lessonId, courseId);
    setResetting(false);
    if (res.error) setDeleteErr(res.error);
    else { setDidReset(true); setDeleted(true); }
  };

  const initials = studentName
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const statusConfig = {
    pending_review: {
      border: 'border-l-amber-400',
      badge: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[11px] font-black uppercase tracking-wide animate-pulse">Pendiente</span>,
    },
    reviewed: {
      border: 'border-l-[#00A9CE]',
      badge: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00A9CE]/10 text-[#00A9CE] text-[11px] font-black uppercase tracking-wide">Devuelta</span>,
    },
    approved: {
      border: 'border-l-emerald-400',
      badge: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-wide"><IoShieldCheckmarkOutline size={10} />Aprobada</span>,
    },
  };

  const cfg = statusConfig[currentStatus as keyof typeof statusConfig] ?? statusConfig.pending_review;

  const loadHistory = async () => {
    if (history) { setHistoryOpen(v => !v); return; }
    const t = await getReviewerThread(lessonId, studentProfileId);
    setHistory(t);
    setHistoryOpen(true);
  };

  if (deleted) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-400 flex items-center gap-2">
        {didReset ? <IoRefreshOutline size={15} /> : <IoTrashOutline size={15} />}
        {didReset
          ? `Entrega de ${studentName} reiniciada — puede volver a entregar.`
          : `Entrega de ${studentName} eliminada.`}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${cfg.border} shadow-sm overflow-hidden transition-shadow hover:shadow-md`}>

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-white text-sm font-bold flex items-center justify-center shrink-0 select-none">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-900 text-sm leading-tight">{studentName}</p>
              {isMyTeam && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 shrink-0">
                  <IoPeopleOutline size={9} /> Mi equipo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">{studentEmail}</p>
          </div>
        </div>
        {cfg.badge}
      </div>

      {/* ── Submission info ── */}
      <div className="px-5 pb-4 space-y-4">

        {/* Version / status row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-black text-slate-400 bg-slate-100 rounded px-2 py-0.5">
            v{latestSubmission.version}
          </span>
          {latestSubmission.is_late
            ? <span className="text-[11px] font-black px-2 py-0.5 rounded bg-red-100 text-red-600">Tardía</span>
            : <span className="text-[11px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-600">A tiempo</span>
          }
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <IoTimeOutline size={11} />
            {timeAgo(latestSubmission.submitted_at)}
          </span>
          {latestSubmission.files.length > 0 && (
            <span className="text-[11px] font-bold text-slate-400">
              {latestSubmission.files.length} archivo{latestSubmission.files.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Files */}
        {latestSubmission.files.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {latestSubmission.files.map(f => (
              <FileRow key={f.id} storageKey={f.storage_key} fileName={f.file_name} contentType={f.content_type} isAdditional={f.is_additional} isLate={f.is_late} />
            ))}
          </div>
        ) : latestSubmission.submission_url ? (
          /* Legacy link-based deliveries */
          <a
            href={latestSubmission.submission_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors w-fit"
          >
            <IoOpenOutline size={13} />
            Abrir entrega
          </a>
        ) : latestSubmission.storage_path ? (
          <DownloadLink storagePath={latestSubmission.storage_path} label="Descargar entrega" />
        ) : (
          <p className="text-xs text-slate-400 italic">Sin archivos adjuntos.</p>
        )}

        {/* Latest review preview (if exists and not approved) */}
        {latestReview && currentStatus !== 'approved' && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Última devolución · {timeAgo(latestReview.reviewed_at)}
            </p>
            {latestReview.feedback_text && (
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 whitespace-pre-line">
                {latestReview.feedback_text}
              </p>
            )}
            {(latestReview.submission_review_files?.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-1.5">
                {latestReview.submission_review_files!.map(f => (
                  <FileRow key={f.id} storageKey={f.storage_key} fileName={f.file_name} contentType={f.content_type} />
                ))}
              </div>
            ) : latestReview.revised_file_name && latestReview.revised_storage_path ? (
              <DownloadLink storagePath={latestReview.revised_storage_path} label={latestReview.revised_file_name} />
            ) : null}
          </div>
        )}

        {/* History toggle */}
        <button
          onClick={loadHistory}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium"
        >
          {historyOpen ? <IoChevronUpOutline size={12} /> : <IoChevronDownOutline size={12} />}
          Ver historial completo
        </button>

        {historyOpen && history && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-100">
            {history.timeline
              .filter(i => i.kind === 'submission' || i.kind === 'review')
              .map((item, idx) => {
                if (item.kind === 'submission') {
                  const sub = item.data;
                  return (
                    <div key={`s-${idx}`} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-black text-slate-400">v{sub.version}</span>
                      <span>{fmtDate(sub.submitted_at)}</span>
                      {sub.is_late && <span className="text-red-500 font-bold">Tardía</span>}
                    </div>
                  );
                }
                if (item.kind === 'review') {
                  const rev = item.data;
                  return (
                    <div key={`r-${idx}`} className="text-xs text-slate-500">
                      <span className="font-bold text-[#00A9CE]">↩ Devolución</span>
                      {rev.reviewer_name && <span className="text-slate-400"> · {rev.reviewer_name}</span>}
                      <span className="text-slate-400"> · {fmtDate(rev.reviewed_at)}</span>
                    </div>
                  );
                }
                return null;
              })}
          </div>
        )}

        {/* Chat */}
        <ChatSection
          lessonId={lessonId}
          studentProfileId={studentProfileId}
          reviewerProfileId={reviewerProfileId}
        />

        {/* Additionals toggle (coach / organizador) */}
        <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${allowAdditional ? 'bg-violet-50 border-violet-200' : 'bg-slate-50 border-slate-200'}`}>
          <IoAddCircleOutline size={16} className={allowAdditional ? 'text-violet-600 shrink-0' : 'text-slate-400 shrink-0'} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold ${allowAdditional ? 'text-violet-800' : 'text-slate-600'}`}>
              {allowAdditional ? 'Adicionales habilitados' : 'Agregar adicionales'}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {allowAdditional
                ? 'El alumno puede sumar archivos a esta entrega. Se cierra solo tras subirlos.'
                : 'Permití que el alumno sume archivos a la entrega ya hecha.'}
            </p>
          </div>
          <button
            onClick={handleToggleAdditional}
            disabled={togglingAdd}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
              allowAdditional
                ? 'bg-white border border-violet-300 text-violet-700 hover:bg-violet-100'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            {togglingAdd ? '…' : allowAdditional ? 'Deshabilitar' : 'Habilitar'}
          </button>
        </div>

        {/* Review form */}
        <div className="pt-1">
          <InlineReviewForm
            submissionId={latestSubmission.id}
            courseId={courseId}
            lessonId={lessonId}
            existingReview={latestReview}
            isApproved={currentStatus === 'approved'}
            onReviewSaved={(approved) => setCurrentStatus(approved ? 'approved' : 'reviewed')}
          />
        </div>

        {/* Reset / delete (organizador / admin only) */}
        {isAdmin && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            {deleteErr && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <IoAlertCircleOutline size={12} /> {deleteErr}
              </span>
            )}
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={handleReset}
                disabled={resetting || deleting}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
                title="Borra todas las versiones para que el alumno entregue de cero"
              >
                <IoRefreshOutline size={13} />
                {resetting ? 'Reiniciando…' : 'Reiniciar'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || resetting}
                className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                <IoTrashOutline size={13} />
                {deleting ? 'Borrando…' : 'Borrar entrega'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
