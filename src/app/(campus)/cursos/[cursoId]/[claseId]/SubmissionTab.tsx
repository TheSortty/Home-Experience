'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  IoAlertCircleOutline, IoCheckmarkCircle, IoCloudUploadOutline,
  IoDocumentOutline, IoLockClosedOutline, IoRefreshOutline,
  IoSendOutline, IoTimeOutline,
} from 'react-icons/io5';
import { submitLesson, postStudentChatMessage, getStudentReviewFileUrl } from '../../actions';
import { supabase } from '@/src/services/supabaseClient';
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

// ─── Link submit zone ─────────────────────────────────────────────────────────

function LinkZone({
  lessonId,
  courseId,
  nextVersion,
  onSuccess,
}: {
  lessonId: string;
  courseId: string;
  nextVersion: number;
  onSuccess: (url: string, version: number) => void;
}) {
  const [url, setUrl] = useState('');
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!url.trim()) { setFeedback({ err: 'Pegá el link de tu trabajo' }); return; }
    setFeedback(null);

    const fd = new FormData();
    fd.append('lessonId', lessonId);
    fd.append('courseId', courseId);
    fd.append('submission_url', url.trim());

    startTransition(async () => {
      const res = await submitLesson(fd);
      if (res.error) {
        setFeedback({ err: res.error });
      } else {
        setFeedback({ ok: `v${res.version ?? nextVersion} enviada correctamente.` });
        setUrl('');
        onSuccess(url.trim(), res.version ?? nextVersion);
      }
    });
  };

  return (
    <div className="space-y-3 pt-4 border-t border-slate-100">
      <p className="text-sm font-bold text-slate-700">
        {nextVersion === 1 ? 'Enviar entrega' : `Enviar versión ${nextVersion}`}
      </p>
      <p className="text-xs text-slate-500">
        Compartí el link de tu trabajo (Google Drive, Dropbox, Notion, YouTube, etc.). Asegurate de que el link tenga permisos para quien tenga el link.
      </p>

      <input
        type="url"
        value={url}
        onChange={(e) => { setUrl(e.target.value); setFeedback(null); }}
        placeholder="https://drive.google.com/..."
        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#00A9CE] focus:ring-2 focus:ring-[#00A9CE]/20 transition-all"
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
      />

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
        disabled={isPending || !url.trim()}
        className="w-full py-3 bg-[#00A9CE] text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
      >
        <IoSendOutline size={16} />
        {isPending ? 'Enviando…' : 'Enviar entrega'}
      </button>
    </div>
  );
}

// ─── Hilo (timeline) view ─────────────────────────────────────────────────────

function HiloView({
  items,
  onDownloadSubmission,
  onDownloadRevised,
}: {
  items: ThreadItem[];
  onDownloadSubmission: (id: string) => void;
  onDownloadRevised: (path: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm italic">
        Todavía no hay entregas. Subí tu primer archivo cuando estés listo.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        if (item.kind === 'submission') {
          const sub = item.data;
          return (
            <div
              key={`sub-${sub.id}-${idx}`}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-xl bg-[#00A9CE]/10 text-[#00A9CE] flex items-center justify-center shrink-0 text-xs font-black">
                v{sub.version}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  {sub.is_late
                    ? <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-600">Atrasada</span>
                    : <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">A tiempo</span>
                  }
                </div>
                <p className="text-xs text-slate-400">{fmtShort(sub.submitted_at)}</p>
              </div>
              {sub.submission_url ? (
                <a
                  href={sub.submission_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-bold text-[#00A9CE] hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <IoDocumentOutline size={14} /> Abrir
                </a>
              ) : null}
            </div>
          );
        }

        if (item.kind === 'review') {
          const rev = item.data;
          const isApproval = !rev.feedback_text && !rev.revised_file_name;
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
              {rev.revised_file_name && rev.revised_storage_path && (
                <button
                  onClick={() => onDownloadRevised(rev.revised_storage_path!)}
                  className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#00A9CE] hover:text-blue-700"
                >
                  <IoDocumentOutline size={14} />
                  Descargar: {rev.revised_file_name}
                </button>
              )}
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
  const [activeTab, setActiveTab] = useState<'hilo' | 'chat'>('hilo');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Local thread state — updated optimistically after new uploads
  const [thread, setThread] = useState(data.thread);

  if (!data.requiresSubmission) {
    return (
      <div className="text-center py-12 text-slate-400 italic text-sm">
        Esta clase no requiere entrega.
      </div>
    );
  }

  const status = thread?.status ?? null;
  const submissions = thread?.submissions ?? [];
  const canUpload = status === null || status === 'reviewed';
  const nextVersion = (submissions.at(-1)?.version ?? 0) + 1;

  // Build hilo items (submissions + reviews only, no chat)
  const hiloItems: ThreadItem[] = thread
    ? thread.timeline.filter(i => i.kind === 'submission' || i.kind === 'review')
    : [];

  const handleDownloadSubmission = async (submissionId: string) => {
    const { getSubmissionDownloadUrl } = await import('../../actions');
    setDownloadingId(submissionId);
    const res = await getSubmissionDownloadUrl(submissionId);
    setDownloadingId(null);
    if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadRevised = async (storagePath: string) => {
    setDownloadingId(storagePath);
    const res = await getStudentReviewFileUrl(storagePath);
    setDownloadingId(null);
    if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer');
  };

  const handleUploadSuccess = (fileName: string, version: number) => {
    // Optimistically update thread state
    setThread(prev => {
      const newSub = {
        id: `opt-${Date.now()}`,
        user_id: studentProfileId ?? '',
        lesson_id: lessonId,
        file_name: fileName,
        storage_path: '',
        is_late: data.isOverdue,
        version,
        status: 'pending_review' as const,
        approved_by: null,
        approved_at: null,
        submitted_at: new Date().toISOString(),
      };
      const newTimeline = [
        ...(prev?.timeline ?? []),
        { kind: 'submission' as const, data: newSub },
      ];
      return {
        status: 'pending_review' as const,
        submissions: [...(prev?.submissions ?? []), newSub],
        reviewsBySubmission: prev?.reviewsBySubmission ?? {},
        chatMessages: prev?.chatMessages ?? [],
        timeline: newTimeline,
      };
    });
  };

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
            <HiloView
              items={hiloItems}
              onDownloadSubmission={handleDownloadSubmission}
              onDownloadRevised={handleDownloadRevised}
            />
            {canUpload && (
              <LinkZone
                lessonId={lessonId}
                courseId={courseId}
                nextVersion={nextVersion}
                onSuccess={handleUploadSuccess}
              />
            )}
            {status === 'pending_review' && (
              <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                <IoLockClosedOutline size={16} className="shrink-0 text-slate-400" />
                Podés enviar una nueva versión cuando tu coach responda.
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
