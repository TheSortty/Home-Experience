'use client';

import { useState, useTransition, useRef } from 'react';
import {
  IoSendOutline,
  IoChatbubblesOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoAddOutline,
  IoCloseOutline,
} from 'react-icons/io5';
import { postLessonComment } from '../../actions';

export interface LessonPost {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  created_at: string;
  author_name: string;
  author_initials: string;
  is_own: boolean;
  replies: LessonPost[];
}

interface Props {
  courseId: string;
  lessonId: string;
  initialPosts: LessonPost[];
  currentUserName: string;
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'ayer';
  if (diffD < 7) return `hace ${diffD} días`;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-emerald-100 text-emerald-600',
  'bg-violet-100 text-violet-600',
  'bg-orange-100 text-orange-600',
  'bg-rose-100 text-rose-600',
];
function avatarColor(userId: string) {
  if (!userId) return AVATAR_COLORS[0];
  const n = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function userInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function LessonForum({
  courseId,
  lessonId,
  initialPosts,
  currentUserName,
}: Props) {
  const [posts, setPosts] = useState<LessonPost[]>(initialPosts);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [isPending, startTransition] = useTransition();
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const submitNewPost = () => {
    const body = newBody.trim();
    if (!body || isPending) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: LessonPost = {
      id: tempId,
      user_id: '',
      title: newTitle.trim() || null,
      body,
      created_at: new Date().toISOString(),
      author_name: currentUserName,
      author_initials: userInitials(currentUserName),
      is_own: true,
      replies: [],
    };
    setPosts((prev) => [optimistic, ...prev]);
    setNewTitle('');
    setNewBody('');
    setShowNewPost(false);

    startTransition(async () => {
      const result = await postLessonComment(courseId, lessonId, body, {
        title: optimistic.title,
      });
      if (result.error) {
        setPosts((prev) => prev.filter((p) => p.id !== tempId));
      } else if (result.id) {
        setPosts((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, id: result.id!, created_at: result.created_at! } : p))
        );
      }
    });
  };

  const submitReply = (parentId: string) => {
    const body = replyBody.trim();
    if (!body || isPending) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: LessonPost = {
      id: tempId,
      user_id: '',
      title: null,
      body,
      created_at: new Date().toISOString(),
      author_name: currentUserName,
      author_initials: userInitials(currentUserName),
      is_own: true,
      replies: [],
    };
    setPosts((prev) =>
      prev.map((p) => (p.id === parentId ? { ...p, replies: [...p.replies, optimistic] } : p))
    );
    setReplyBody('');
    setReplyingTo(null);

    startTransition(async () => {
      const result = await postLessonComment(courseId, lessonId, body, {
        parentId,
      });
      if (result.error) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === parentId ? { ...p, replies: p.replies.filter((r) => r.id !== tempId) } : p
          )
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header + new post CTA */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">Preguntas y comentarios</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Lo que se abre acá queda visible en la comunidad del programa.
          </p>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="shrink-0 flex items-center gap-1.5 bg-[#00A9CE] hover:bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-colors"
        >
          <IoAddOutline size={16} /> Nueva pregunta
        </button>
      </div>

      {/* Inline new post form */}
      {showNewPost && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título (opcional)"
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:border-[#00A9CE] focus:ring-2 focus:ring-[#00A9CE]/20"
          />
          <textarea
            rows={3}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="¿Qué querés preguntar o compartir sobre esta clase?"
            maxLength={2000}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#00A9CE] focus:ring-2 focus:ring-[#00A9CE]/20 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowNewPost(false); setNewTitle(''); setNewBody(''); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={submitNewPost}
              disabled={!newBody.trim() || isPending}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#00A9CE] hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
            >
              <IoSendOutline size={14} /> Publicar
            </button>
          </div>
        </div>
      )}

      {/* Posts list */}
      {posts.length === 0 && !showNewPost ? (
        <div className="bg-cream/40 border border-cream-deep rounded-xl p-10 text-center">
          <div className="w-12 h-12 bg-white/60 text-terra-soft rounded-full flex items-center justify-center mb-3 mx-auto">
            <IoChatbubblesOutline size={24} />
          </div>
          <p className="text-sm font-bold text-slate-700 mb-1">Todavía no hay preguntas</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-serif italic">
            ¿Tenés una duda o algo que se te abrió con esta clase? Empezá vos.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => {
            const isExpanded = expanded === post.id;
            const hasReplies = post.replies.length > 0;
            return (
              <li key={post.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(post.user_id)}`}
                    >
                      {post.author_initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-bold text-slate-700">
                          {post.is_own ? 'Vos' : post.author_name}
                        </span>
                        <span>·</span>
                        <span>{timeAgo(post.created_at)}</span>
                      </div>
                      {post.title && (
                        <p className="font-bold text-slate-900 text-sm leading-snug mb-1">
                          {post.title}
                        </p>
                      )}
                      <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                        {post.body}
                      </p>

                      {/* Footer: replies count + actions */}
                      <div className="mt-3 flex items-center gap-4 text-xs">
                        {hasReplies && (
                          <button
                            onClick={() => setExpanded(isExpanded ? null : post.id)}
                            className="font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
                            {post.replies.length} {post.replies.length === 1 ? 'respuesta' : 'respuestas'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setExpanded(post.id);
                            setReplyingTo(post.id);
                            setTimeout(() => replyRef.current?.focus(), 50);
                          }}
                          className="font-bold text-[#00A9CE] hover:underline"
                        >
                          Responder
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {isExpanded && (
                  <div className="bg-slate-50/70 border-t border-slate-100 px-4 py-4 space-y-3">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3 pl-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(reply.user_id)}`}
                        >
                          {reply.author_initials}
                        </div>
                        <div className="flex-1 bg-white rounded-lg border border-slate-200 px-3 py-2">
                          <div className="flex items-center gap-2 mb-0.5 text-xs">
                            <span className="font-bold text-slate-700">
                              {reply.is_own ? 'Vos' : reply.author_name}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-400">{timeAgo(reply.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-line">{reply.body}</p>
                        </div>
                      </div>
                    ))}

                    {/* Reply input */}
                    {replyingTo === post.id ? (
                      <div className="pl-2 flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#00A9CE] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {userInitials(currentUserName)}
                        </div>
                        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-2">
                          <textarea
                            ref={replyRef}
                            rows={2}
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                            placeholder="Tu respuesta..."
                            maxLength={2000}
                            className="w-full text-sm text-slate-700 placeholder-slate-400 resize-none outline-none"
                          />
                          <div className="flex justify-end gap-2 mt-1">
                            <button
                              onClick={() => { setReplyingTo(null); setReplyBody(''); }}
                              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded"
                            >
                              <IoCloseOutline size={14} />
                            </button>
                            <button
                              onClick={() => submitReply(post.id)}
                              disabled={!replyBody.trim() || isPending}
                              className="flex items-center gap-1 text-xs font-bold bg-[#00A9CE] hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-1 rounded"
                            >
                              <IoSendOutline size={12} /> Responder
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setReplyingTo(post.id);
                          setTimeout(() => replyRef.current?.focus(), 50);
                        }}
                        className="ml-12 text-xs font-bold text-[#00A9CE] hover:underline"
                      >
                        + Sumar tu voz
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
