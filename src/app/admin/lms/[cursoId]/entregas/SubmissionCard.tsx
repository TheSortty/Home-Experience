'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  IoCheckmarkCircle, IoAlertCircleOutline, IoDocumentOutline,
  IoChevronDownOutline, IoChevronUpOutline, IoTimeOutline,
  IoChatbubbleEllipsesOutline, IoSendOutline, IoShieldCheckmarkOutline,
  IoPeopleOutline,
} from 'react-icons/io5';
import { getAdminSignedUrl, getReviewerThread, postReviewerChatMessage } from '../../actions';
import { supabase } from '@/src/services/supabaseClient';
import ReviewForm from './ReviewForm';
import type { SubmissionThread, ChatMessage } from '@/src/types/submissions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubmissionSummary {
  id: string;
  file_name: string;
  storage_path: string;
  submitted_at: string;
  is_late: boolean;
  version: number;
  status: string;
  user_id: string;
}

interface ReviewSummary {
  id: string;
  feedback_text: string | null;
  revised_file_name: string | null;
  revised_storage_path: string | null;
  reviewed_at: string;
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved')
    return <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-emerald-100 text-emerald-700 flex items-center gap-1"><IoShieldCheckmarkOutline size={10} />Aprobada</span>;
  if (status === 'reviewed')
    return <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-[#00A9CE]/10 text-[#00A9CE]">Revisada · esperando alumno</span>;
  return <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-amber-100 text-amber-700 animate-pulse">Pendiente de revisión</span>;
}

// ─── Thread section (lazy) ────────────────────────────────────────────────────

function ThreadSection({
  lessonId,
  studentProfileId,
  reviewerProfileId,
}: {
  lessonId: string;
  studentProfileId: string;
  reviewerProfileId: string;
}) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<SubmissionThread | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (thread) return;
    setLoading(true);
    const t = await getReviewerThread(lessonId, studentProfileId);
    setThread(t);
    setLoading(false);
  };

  const handleToggle = () => {
    if (!open) load();
    setOpen(v => !v);
  };

  const hiloItems = thread
    ? thread.timeline.filter(i => i.kind === 'submission' || i.kind === 'review')
    : [];

  return (
    <div className="border-t border-slate-100 pt-3">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        {open ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
        Ver hilo completo
        {thread && <span className="text-slate-400 font-normal">({thread.submissions.length} versión{thread.submissions.length !== 1 ? 'es' : ''})</span>}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-[#00A9CE] rounded-full animate-spin" />
            </div>
          )}
          {!loading && hiloItems.length === 0 && (
            <p className="text-xs text-slate-400 italic">Sin historial previo.</p>
          )}
          {!loading && hiloItems.map((item, idx) => {
            if (item.kind === 'submission') {
              const sub = item.data;
              return (
                <div key={`s-${sub.id}-${idx}`} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-black text-[#00A9CE] bg-[#00A9CE]/10 rounded px-1.5 py-0.5 shrink-0">v{sub.version}</span>
                  <span className="text-xs text-slate-700 flex-1 truncate">{sub.file_name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${sub.is_late ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    {sub.is_late ? 'Tardía' : 'En tiempo'}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(sub.submitted_at)}</span>
                </div>
              );
            }
            if (item.kind === 'review') {
              const rev = item.data;
              return (
                <div key={`r-${rev.id}-${idx}`} className="bg-white border border-slate-200 rounded-lg px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {rev.reviewer_name ? `Devolución · ${rev.reviewer_name}` : 'Devolución del equipo'}
                    </span>
                    <span className="text-[10px] text-slate-400">{fmtDate(rev.reviewed_at)}</span>
                  </div>
                  {rev.feedback_text && (
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line line-clamp-3">
                      {rev.feedback_text}
                    </p>
                  )}
                  {rev.revised_file_name && rev.revised_storage_path && (
                    <DownloadLink storagePath={rev.revised_storage_path} label={rev.revised_file_name} />
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

// ─── Chat section (lazy + realtime) ──────────────────────────────────────────

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

  // Realtime subscription
  useEffect(() => {
    if (!open) return;
    const channelName = `coach-chat-${lessonId}-${studentProfileId}`;
    supabase.getChannels().forEach(ch => {
      if (ch.topic.includes(channelName)) supabase.removeChannel(ch);
    });
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'submission_chat_messages',
        filter: `lesson_id=eq.${lessonId}`,
      }, (payload) => {
        const row = payload.new as any;
        if (row.student_id !== studentProfileId) return;
        const isOwn = row.author_id === reviewerProfileId;
        setMessages(prev => {
          if (!prev) return [row];
          if (prev.some(m => m.id === row.id)) return prev;
          return [...prev, {
            id: row.id,
            lesson_id: row.lesson_id,
            student_id: row.student_id,
            author_id: row.author_id,
            body: row.body,
            created_at: row.created_at,
            author_name: isOwn ? 'Vos (coach)' : null,
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
      id: `opt-${Date.now()}`,
      lesson_id: lessonId,
      student_id: studentProfileId,
      author_id: reviewerProfileId,
      body: trimmed,
      created_at: new Date().toISOString(),
      author_name: 'Vos (coach)',
      author_side: 'reviewer',
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

  const unreadCount = messages?.filter(m => m.author_side === 'student').length ?? 0;

  return (
    <div className="border-t border-slate-100 pt-3">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        {open ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
        <IoChatbubbleEllipsesOutline size={14} />
        Chat
        {messages !== null && messages.length > 0 && (
          <span className="text-slate-400 font-normal">({messages.length} mensaje{messages.length !== 1 ? 's' : ''})</span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loadingMsgs && (
            <div className="flex items-center justify-center py-3">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-[#00A9CE] rounded-full animate-spin" />
            </div>
          )}
          {!loadingMsgs && (
            <>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {(messages ?? []).length === 0 && (
                  <p className="text-xs text-slate-400 italic">Sin mensajes todavía.</p>
                )}
                {(messages ?? []).map(msg => {
                  const isReviewer = msg.author_side === 'reviewer';
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isReviewer ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${isReviewer ? 'bg-slate-700 text-white' : 'bg-[#00A9CE] text-white'}`}>
                        {isReviewer ? 'C' : 'A'}
                      </div>
                      <div className={`max-w-[70%] ${isReviewer ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${isReviewer ? 'bg-slate-700 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                          <p className="whitespace-pre-line">{msg.body}</p>
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

              <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-xl p-2 focus-within:border-[#00A9CE] transition-colors">
                <textarea
                  rows={2}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Mensaje al alumno… (Enter para enviar)"
                  className="flex-1 text-xs text-slate-700 placeholder-slate-400 resize-none outline-none bg-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={isPending || !body.trim()}
                  className="shrink-0 w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center hover:bg-slate-900 transition-colors disabled:opacity-40"
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

// ─── Download link helper ─────────────────────────────────────────────────────

function DownloadLink({ storagePath, label }: { storagePath: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    const res = await getAdminSignedUrl(storagePath);
    setLoading(false);
    if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer');
  };
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1 text-[10px] font-bold text-[#00A9CE] hover:text-blue-700 transition-colors disabled:opacity-50"
    >
      <IoDocumentOutline size={12} />
      {loading ? 'Cargando…' : label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
}: Props) {
  const [currentStatus, setCurrentStatus] = useState(latestSubmission.status);

  const initials = studentName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden ${
      currentStatus === 'pending_review'
        ? 'border-amber-200 shadow-sm shadow-amber-50'
        : currentStatus === 'approved'
        ? 'border-emerald-200'
        : 'border-slate-200'
    }`}>
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-900 text-sm">{studentName}</p>
              {isMyTeam && (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                  <IoPeopleOutline size={10} /> Mi equipo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{studentEmail}</p>
          </div>
        </div>
        <StatusBadge status={currentStatus} />
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Latest submission row */}
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
          <span className="text-[11px] font-black text-[#00A9CE] bg-[#00A9CE]/10 rounded px-2 py-0.5 shrink-0">
            v{latestSubmission.version}
          </span>
          <span className="text-sm text-slate-700 flex-1 font-medium truncate">
            {latestSubmission.file_name}
          </span>
          {latestSubmission.is_late && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 shrink-0">
              Tardía
            </span>
          )}
          <span className="text-xs text-slate-400 shrink-0">
            {fmtDate(latestSubmission.submitted_at)}
          </span>
          <DownloadLink storagePath={latestSubmission.storage_path} label="Descargar" />
        </div>

        {/* Latest review (if exists) */}
        {latestReview && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Última devolución · {fmtDate(latestReview.reviewed_at)}
            </p>
            {latestReview.feedback_text && (
              <p className="text-xs text-slate-700 leading-relaxed line-clamp-3 whitespace-pre-line">
                {latestReview.feedback_text}
              </p>
            )}
            {latestReview.revised_file_name && latestReview.revised_storage_path && (
              <DownloadLink storagePath={latestReview.revised_storage_path} label={latestReview.revised_file_name} />
            )}
          </div>
        )}

        {/* Expandable: full thread */}
        <ThreadSection
          lessonId={lessonId}
          studentProfileId={studentProfileId}
          reviewerProfileId={reviewerProfileId}
        />

        {/* Expandable: chat */}
        <ChatSection
          lessonId={lessonId}
          studentProfileId={studentProfileId}
          reviewerProfileId={reviewerProfileId}
        />

        {/* Review form */}
        <div className="border-t border-slate-100 pt-4">
          <ReviewForm
            submissionId={latestSubmission.id}
            courseId={courseId}
            lessonId={lessonId}
            existingReview={latestReview}
            isApproved={currentStatus === 'approved'}
            onReviewSaved={(approved) => setCurrentStatus(approved ? 'approved' : 'reviewed')}
          />
        </div>
      </div>
    </div>
  );
}
