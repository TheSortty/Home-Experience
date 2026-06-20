'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  IoAlertCircleOutline, IoCheckmarkCircle, IoCloudUploadOutline,
  IoDocumentOutline, IoLockClosedOutline, IoRefreshOutline,
  IoSendOutline, IoTimeOutline, IoCloseOutline,
} from 'react-icons/io5';
import { submitLesson, addSubmissionFiles, postStudentChatMessage } from '../../actions';
import { supabase } from '@/src/services/supabaseClient';
import { entregaDownloadHref } from '@/src/services/entregaDownload';
import type { ChatMessage, SubmissionTabData, ThreadItem } from '@/src/types/submissions';

// ─── Re-export so LessonViewer can import the type from one place ─────────────
export type { SubmissionTabData as SubmissionData };

interface Props {
  lessonId: string;
  courseId: string;
  data: SubmissionTabData;
  studentProfileId?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Status banner ────────────────────────────────────────────────────────────

function StatusBanner({ status }: { status: 'pending_review' | 'reviewed' | 'approved' | null }) {
  if (!status) return null;
  if (status === 'approved') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
        <IoCheckmarkCircle size={20} className="shrink-0 text-emerald-500" />
        <div>
          <p className="font-bold">¡Entrega aprobada!</p>
          <p className="text-xs text-emerald-600 mt-0.5">Tu coach cerró el hilo. Este trabajo está listo.</p>
        </div>
      </div>
    );
  }
  if (status === 'reviewed') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#00A9CE]/10 border border-[#00A9CE]/30 text-[#00A9CE] text-sm font-medium">
        <IoRefreshOutline size={20} className="shrink-0" />
        <div>
          <p className="font-bold">Tu coach respondió</p>
          <p className="text-xs mt-0.5 text-[#00A9CE]/80">Revisá la devolución y enviá una nueva versión cuando estés listo.</p>
        </div>
      </div>
    );
  }
  // pending_review
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
      <IoTimeOutline size={20} className="shrink-0 text-amber-500" />
      <div>
        <p className="font-bold">Entrega en revisión</p>
        <p className="text-xs text-amber-600 mt-0.5">Tu coach está revisando tu trabajo. Podrás enviar una nueva versión cuando responda.</p>
      </div>
    </div>
  );
}

// ─── Due date banner ──────────────────────────────────────────────────────────

function DueDateBanner({ data }: { data: SubmissionTabData }) {
  if (!data.dueDate) return null;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
      data.isOverdue
        ? 'bg-red-50 border border-red-200 text-red-700'
        : data.daysRemaining !== null && data.daysRemaining <= 3
        ? 'bg-amber-50 border border-amber-200 text-amber-700'
        : 'bg-slate-50 border border-slate-200 text-slate-600'
    }`}>
      {data.isOverdue
        ? <IoAlertCircleOutline size={18} className="shrink-0" />
        : <IoTimeOutline size={18} className="shrink-0" />}
      {data.isOverdue
        ? <span>Entrega <strong>atrasada</strong> — vencía el {fmt(data.dueDate)}</span>
        : <span>Fecha límite: <strong>{fmt(data.dueDate)}</strong>
            {data.daysRemaining !== null && ` · ${data.daysRemaining} día${data.daysRemaining !== 1 ? 's' : ''} restante${data.daysRemaining !== 1 ? 's' : ''}`}
          </span>
      }
    </div>
  );
}

// ─── File upload zone (multi-file, single delivery) ───────────────────────────

const MAX_FILES = 8;
const MAX_MB = 5;
const ACCEPT = '.pdf,.doc,.docx,.odt,.rtf,.txt,.md,.csv,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.bmp,.tif,.tiff';

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function UploadZone({
  lessonId,
  courseId,
  nextVersion,
  onSuccess,
  mode = 'version',
}: {
  lessonId: string;
  courseId: string;
  nextVersion: number;
  onSuccess: () => void;
  mode?: 'version' | 'additional';
}) {
  const isAdditional = mode === 'additional';
  const [files, setFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFeedback(null);
    const picked = Array.from(incoming);
    const tooBig = picked.find(f => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) { setFeedback({ err: `"${tooBig.name}" supera los ${MAX_MB} MB` }); return; }
    setFiles(prev => {
      // De-dup by name+size, cap at MAX_FILES
      const merged = [...prev];
      for (const f of picked) {
        if (!merged.some(m => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      if (merged.length > MAX_FILES) { setFeedback({ err: `Máximo ${MAX_FILES} archivos` }); }
      return merged.slice(0, MAX_FILES);
    });
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (files.length === 0) { setFeedback({ err: 'Adjuntá al menos un archivo' }); return; }
    setFeedback(null);

    const fd = new FormData();
    fd.append('lessonId', lessonId);
    fd.append('courseId', courseId);
    for (const f of files) fd.append('files', f);

    startTransition(async () => {
      const res = isAdditional ? await addSubmissionFiles(fd) : await submitLesson(fd);
      if (res.error) {
        setFeedback({ err: res.error });
      } else {
        setFeedback({
          ok: isAdditional
            ? `Agregaste ${files.length} archivo${files.length !== 1 ? 's' : ''}${(res as { isLate?: boolean }).isLate ? ' · fuera de término' : ' · dentro de término'}.`
            : `Versión ${(res as { version?: number }).version ?? nextVersion} enviada correctamente.`,
        });
        setFiles([]);
        if (inputRef.current) inputRef.current.value = '';
        onSuccess();
      }
    });
  };

  return (
    <div className={`space-y-3 pt-4 border-t ${isAdditional ? 'border-violet-200' : 'border-slate-100'}`}>
      <p className="text-sm font-bold text-slate-700">
        {isAdditional ? 'Agregar archivos adicionales' : nextVersion === 1 ? 'Enviar entrega' : `Enviar versión ${nextVersion}`}
      </p>
      <p className="text-xs text-slate-500">
        {isAdditional
          ? `Tu coach habilitó sumar archivos a tu entrega ya hecha. Quedará registrado si los subís dentro o fuera de término. Hasta ${MAX_FILES} archivos de ${MAX_MB} MB cada uno.`
          : `Subí tus archivos (PDF, Word, imágenes…). Podés adjuntar varios en una misma entrega — hasta ${MAX_FILES} archivos de ${MAX_MB} MB cada uno.`}
      </p>

      {/* Drop / picker */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#00A9CE] hover:text-[#00A9CE] transition-colors"
      >
        <IoCloudUploadOutline size={26} />
        <span className="text-sm font-bold">Elegí archivos o arrastralos acá</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* Selected files */}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, idx) => (
            <li key={`${f.name}-${idx}`} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              <IoDocumentOutline size={15} className="shrink-0 text-slate-400" />
              <span className="flex-1 min-w-0 truncate text-sm text-slate-700">{f.name}</span>
              <span className="text-[11px] text-slate-400 shrink-0">{fmtSize(f.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                aria-label="Quitar"
              >
                <IoCloseOutline size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

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
        onClick={handleSubmit}
        disabled={isPending || files.length === 0}
        className="w-full py-3 bg-[#00A9CE] text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
      >
        <IoSendOutline size={16} />
        {isPending ? 'Subiendo…' : isAdditional ? 'Agregar archivos' : 'Enviar entrega'}
      </button>
    </div>
  );
}

// ─── Hilo (timeline) view ─────────────────────────────────────────────────────

function HiloView({ items }: { items: ThreadItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm italic">
        Todavía no hay entregas. Subí tus archivos cuando estés listo.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        if (item.kind === 'submission') {
          const sub = item.data;
          const files = sub.files ?? [];
          return (
            <div
              key={`sub-${sub.id}-${idx}`}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-xl bg-[#00A9CE]/10 text-[#00A9CE] flex items-center justify-center shrink-0 text-xs font-black">
                v{sub.version}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {sub.is_late
                    ? <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-600">Atrasada</span>
                    : <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">A tiempo</span>
                  }
                  <span className="text-xs text-slate-400">{fmtShort(sub.submitted_at)}</span>
                </div>

                {/* Files */}
                {files.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {files.map(f => (
                      <div key={f.id} className="flex items-center gap-2 flex-wrap">
                        <a
                          href={entregaDownloadHref(f.storage_key)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-[#00A9CE] hover:text-blue-700 transition-colors w-fit"
                        >
                          <IoDocumentOutline size={14} /> {f.file_name}
                        </a>
                        {f.is_additional && (
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${f.is_late ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                            Adicional · {f.is_late ? 'fuera de término' : 'a tiempo'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : sub.submission_url ? (
                  <a
                    href={sub.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-[#00A9CE] hover:text-blue-700 transition-colors w-fit"
                  >
                    <IoDocumentOutline size={14} /> Abrir entrega
                  </a>
                ) : null}
              </div>
            </div>
          );
        }

        if (item.kind === 'review') {
          const rev = item.data;
          const revFiles = rev.files ?? [];
          const isApproval = !rev.feedback_text && !rev.revised_file_name && revFiles.length === 0;
          return (
            <div
              key={`rev-${rev.id}-${idx}`}
              className={`rounded-xl p-4 border ${
                isApproval
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isApproval ? '✓ Aprobada por el equipo' : `Devolución${rev.reviewer_name ? ` de ${rev.reviewer_name}` : ''}`}
                </p>
                <span className="text-xs text-slate-400 shrink-0">{fmtShort(rev.reviewed_at)}</span>
              </div>
              {rev.feedback_text && (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {rev.feedback_text}
                </p>
              )}
              {revFiles.length > 0 ? (
                <div className="mt-2 flex flex-col gap-1">
                  {revFiles.map(f => (
                    <a
                      key={f.id}
                      href={entregaDownloadHref(f.storage_key)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold text-[#00A9CE] hover:text-blue-700 w-fit"
                    >
                      <IoDocumentOutline size={14} />
                      Descargar: {f.file_name}
                    </a>
                  ))}
                </div>
              ) : rev.revised_file_name && rev.revised_storage_path ? (
                <a
                  href={entregaDownloadHref(rev.revised_storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#00A9CE] hover:text-blue-700 w-fit"
                >
                  <IoDocumentOutline size={14} />
                  Descargar: {rev.revised_file_name}
                </a>
              ) : null}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

// ─── Chat view ────────────────────────────────────────────────────────────────

function ChatView({
  lessonId,
  initialMessages,
  studentProfileId,
}: {
  lessonId: string;
  initialMessages: ChatMessage[];
  studentProfileId?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Realtime subscription for incoming messages
  useEffect(() => {
    const channelName = `chat-student-${lessonId}`;
    supabase.getChannels().forEach(ch => {
      if (ch.topic.includes(channelName)) supabase.removeChannel(ch);
    });

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submission_chat_messages',
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload) => {
          const row = payload.new as any;
          // Avoid duplicating optimistic messages (author_id matches student)
          const isOwn = row.author_id === studentProfileId;
          setMessages(prev => {
            if (prev.some(m => m.id === row.id)) return prev;
            return [...prev, {
              id: row.id,
              lesson_id: row.lesson_id,
              student_id: row.student_id,
              author_id: row.author_id,
              body: row.body,
              created_at: row.created_at,
              author_name: isOwn ? 'Vos' : null,
              author_side: isOwn ? 'student' : 'reviewer',
            }];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lessonId, studentProfileId]);

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    // Optimistic insert
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      lesson_id: lessonId,
      student_id: studentProfileId ?? '',
      author_id: studentProfileId ?? '',
      body: trimmed,
      created_at: new Date().toISOString(),
      author_name: 'Vos',
      author_side: 'student',
    };
    setMessages(prev => [...prev, optimistic]);
    setBody('');
    setErr(null);

    startTransition(async () => {
      const res = await postStudentChatMessage(lessonId, trimmed);
      if (res.error) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setErr(res.error);
      }
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (messages.length === 0 && !body) {
    return (
      <div className="flex flex-col h-full min-h-[200px]">
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic py-8">
          Todavía no hay mensajes. Usá el chat para aclarar dudas sobre tu entrega.
        </div>
        <ChatInput body={body} setBody={setBody} onSend={handleSend} onKey={handleKey} isPending={isPending} textareaRef={textareaRef} err={err} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {messages.map((msg) => {
          const isStudent = msg.author_side === 'student';
          return (
            <div key={msg.id} className={`flex gap-2 ${isStudent ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                isStudent ? 'bg-[#00A9CE] text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {isStudent ? 'V' : 'C'}
              </div>
              <div className={`max-w-[75%] ${isStudent ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  isStudent
                    ? 'bg-[#00A9CE] text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-line">{msg.body}</p>
                </div>
                <span className="text-[10px] text-slate-400 px-1">
                  {msg.author_name ?? (isStudent ? 'Vos' : 'Coach')} · {fmtShort(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <ChatInput body={body} setBody={setBody} onSend={handleSend} onKey={handleKey} isPending={isPending} textareaRef={textareaRef} err={err} />
    </div>
  );
}

function ChatInput({
  body, setBody, onSend, onKey, isPending, textareaRef, err,
}: {
  body: string;
  setBody: (v: string) => void;
  onSend: () => void;
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isPending: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  err: string | null;
}) {
  return (
    <div className="space-y-1.5">
      {err && <p className="text-xs text-red-600 flex items-center gap-1"><IoAlertCircleOutline size={13} />{err}</p>}
      <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-xl p-2 focus-within:border-[#00A9CE] transition-colors">
        <textarea
          ref={textareaRef}
          rows={2}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={onKey}
          placeholder="Escribí un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
          className="flex-1 text-sm text-slate-700 placeholder-slate-400 resize-none outline-none bg-transparent"
        />
        <button
          onClick={onSend}
          disabled={isPending || !body.trim()}
          className="shrink-0 w-8 h-8 rounded-lg bg-[#00A9CE] text-white flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-40 mb-0.5"
          aria-label="Enviar"
        >
          <IoSendOutline size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function SubmissionTab({ lessonId, courseId, data, studentProfileId }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'hilo' | 'chat'>('hilo');

  const thread = data.thread;

  if (!data.requiresSubmission) {
    return (
      <div className="text-center py-12 text-slate-400 italic text-sm">
        Esta clase no requiere entrega.
      </div>
    );
  }

  const status = thread?.status ?? null;
  const submissions = thread?.submissions ?? [];
  const canUpload = (status === null || status === 'reviewed') && !data.submissionsClosed;
  const nextVersion = (submissions.at(-1)?.version ?? 0) + 1;
  // Coach/organizer enabled the student to attach extra files to the existing
  // delivery (independent of the version flow).
  const additionalAllowed = submissions.at(-1)?.allow_additional ?? false;

  // Build hilo items (submissions + reviews only, no chat)
  const hiloItems: ThreadItem[] = thread
    ? thread.timeline.filter(i => i.kind === 'submission' || i.kind === 'review')
    : [];

  // After a successful upload, re-fetch server data so the new version (with its
  // real R2 file keys) shows up in the thread.
  const handleUploadSuccess = () => router.refresh();

  return (
    <div className="space-y-4">
      {/* Due date banner */}
      {data.dueDate && status !== 'approved' && <DueDateBanner data={data} />}

      {/* Status banner */}
      <StatusBanner status={status} />

      {/* Tabs — only when there's a thread */}
      {thread && (
        <div className="flex gap-1 border-b border-slate-200 -mb-1">
          {(['hilo', 'chat'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-bold transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-[#00A9CE] text-[#00A9CE]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'hilo' ? 'Hilo de entrega' : 'Chat con tu coach'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div>
        {(!thread || activeTab === 'hilo') && (
          <div className="space-y-4">
            <HiloView items={hiloItems} />
            {canUpload && (
              <UploadZone
                lessonId={lessonId}
                courseId={courseId}
                nextVersion={nextVersion}
                onSuccess={handleUploadSuccess}
              />
            )}
            {additionalAllowed && (
              <UploadZone
                mode="additional"
                lessonId={lessonId}
                courseId={courseId}
                nextVersion={nextVersion}
                onSuccess={handleUploadSuccess}
              />
            )}
            {status === 'pending_review' && !data.submissionsClosed && (
              <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                <IoLockClosedOutline size={16} className="shrink-0 text-slate-400" />
                Podés enviar una nueva versión cuando tu coach responda.
              </div>
            )}
            {data.submissionsClosed && status !== 'approved' && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3 border border-red-200">
                <IoLockClosedOutline size={16} className="shrink-0 text-red-400" />
                El plazo de entrega de esta clase venció. Ya no se aceptan nuevas entregas.
              </div>
            )}
            {status === 'approved' && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-200">
                <IoCheckmarkCircle size={16} className="shrink-0" />
                Hilo cerrado. ¡Muy bien trabajo!
              </div>
            )}
          </div>
        )}

        {thread && activeTab === 'chat' && (
          <ChatView
            lessonId={lessonId}
            initialMessages={thread.chatMessages}
            studentProfileId={studentProfileId}
          />
        )}
      </div>
    </div>
  );
}
