'use client';

import { useState, useTransition, useRef, useMemo } from 'react';
import {
  IoPeopleOutline,
  IoChatbubbleEllipsesOutline,
  IoSearchOutline,
  IoSendOutline,
  IoCloseOutline,
  IoPersonCircleOutline,
  IoAddOutline,
  IoLayersOutline,
} from 'react-icons/io5';
import { supabase } from '@/src/services/supabaseClient';
import { colorForProgram } from '../_lib/programColor';

export type ForumPost = {
  id: string;
  course_id: string;
  user_id: string;
  author_name: string;
  title: string | null;
  body: string;
  parent_id: string | null;
  created_at: string;
  replies: ForumPost[];
  // Lesson context (real, from DB joins) — present when posted from a lesson's
  // "Foro" tab. Null for posts created via the global "Abrir conversación".
  lesson_id?: string | null;
  lessonTitle?: string | null;
  lessonOrder?: number | null;
  moduleTitle?: string | null;
  moduleOrder?: number | null;
};

export type CourseTab = {
  id: string;
  title: string;
};

interface Props {
  profileId: string;
  courses: CourseTab[];
  initialPosts: ForumPost[];
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} días`;
  return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
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

// Build the section tag for a post.
// Priority: real lesson context from the DB (set when the post was created from
// a lesson's "Foro" tab). Fallback to a heuristic pattern match against the
// text — useful for legacy posts and posts made from the global "Abrir
// conversación" that mention a section in the body.
function getSectionTag(post: ForumPost): string | null {
  // Real context wins
  if (post.moduleOrder != null && post.lessonOrder != null) {
    return `Módulo ${post.moduleOrder} · Clase ${post.lessonOrder}`;
  }
  if (post.lessonOrder != null) {
    return `Clase ${post.lessonOrder}`;
  }
  if (post.moduleOrder != null) {
    return `Módulo ${post.moduleOrder}`;
  }

  // Fallback: scan the text
  const text = `${post.title ?? ''} ${post.body}`;
  const patterns: { rx: RegExp; label: (m: string) => string }[] = [
    { rx: /m[oó]dulo\s+(\d+)/i, label: (n) => `Módulo ${n}` },
    { rx: /clase\s+(\d+)/i,     label: (n) => `Clase ${n}` },
    { rx: /encuentro\s+(\d+)/i, label: (n) => `Encuentro ${n}` },
    { rx: /unidad\s+(\d+)/i,    label: (n) => `Unidad ${n}` },
  ];
  for (const { rx, label } of patterns) {
    const m = text.match(rx);
    if (m) return label(m[1]);
  }
  return null;
}

export default function ForumClient({ profileId, courses, initialPosts }: Props) {
  const [posts, setPosts] = useState<ForumPost[]>(initialPosts);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCourse, setNewCourse] = useState(courses[0]?.id ?? '');
  const [isPending, startTransition] = useTransition();
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // Build root posts and per-program counts
  const rootPosts = useMemo(() => posts.filter(p => p.parent_id === null), [posts]);
  const countsByCourse = useMemo(() => {
    const map: Record<string, number> = {};
    rootPosts.forEach(p => { map[p.course_id] = (map[p.course_id] || 0) + 1; });
    return map;
  }, [rootPosts]);

  const filtered = rootPosts.filter(p => {
    if (selectedCourse !== 'all' && p.course_id !== selectedCourse) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.title?.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || p.author_name.toLowerCase().includes(q));
    }
    return true;
  });

  const handleNewPost = () => {
    if (!newBody.trim() || !newCourse) return;
    startTransition(async () => {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          course_id: newCourse,
          user_id: profileId,
          title: newTitle.trim() || null,
          body: newBody.trim(),
          parent_id: null,
        })
        .select('id, course_id, user_id, title, body, parent_id, created_at')
        .single();

      if (!error && data) {
        const newPostObj: ForumPost = {
          ...data,
          author_name: 'Vos',
          replies: [],
        };
        setPosts(prev => [newPostObj, ...prev]);
        setNewTitle('');
        setNewBody('');
        setShowNewPost(false);
      }
    });
  };

  const handleReply = (postId: string) => {
    if (!replyBody.trim()) return;
    const parentPost = posts.find(p => p.id === postId);
    if (!parentPost) return;

    startTransition(async () => {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          course_id: parentPost.course_id,
          user_id: profileId,
          title: null,
          body: replyBody.trim(),
          parent_id: postId,
        })
        .select('id, course_id, user_id, title, body, parent_id, created_at')
        .single();

      if (!error && data) {
        const replyObj: ForumPost = { ...data, author_name: 'Vos', replies: [] };
        setPosts(prev =>
          prev.map(p =>
            p.id === postId ? { ...p, replies: [...p.replies, replyObj] } : p
          )
        );
        setReplyBody('');
        setReplyingTo(null);
      }
    });
  };

  const courseById = useMemo(() => {
    const map: Record<string, CourseTab> = {};
    courses.forEach(c => { map[c.id] = c; });
    return map;
  }, [courses]);

  return (
    <div className="space-y-6">
      {/* ─── HEADER ───────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-slate-900 flex items-center gap-3">
            <IoPeopleOutline className="text-[#00A9CE] shrink-0" /> Entre nosotros
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Lo que se va abriendo en cada cohort, en un mismo lugar.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center bg-white border border-slate-200 rounded-full px-4 py-2 w-full sm:w-72">
            <IoSearchOutline className="text-slate-400 shrink-0" size={18} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar entre las conversaciones..."
              className="bg-transparent border-none outline-none flex-1 ml-2 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => setShowNewPost(true)}
            className="flex items-center justify-center gap-2 bg-[#00A9CE] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm shrink-0"
          >
            <IoAddOutline size={18} /> Abrir conversación
          </button>
        </div>
      </header>

      {/* ─── SPLIT: SIDEBAR + FEED ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6">

        {/* SIDEBAR — programs */}
        <aside className="space-y-1 lg:sticky lg:top-20 lg:self-start">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-3">
            Programas
          </p>
          <button
            onClick={() => setSelectedCourse('all')}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCourse === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Todos</span>
            <span className={`text-xs ${selectedCourse === 'all' ? 'text-white/70' : 'text-slate-400'}`}>
              {rootPosts.length}
            </span>
          </button>
          {courses.map(c => {
            const color = colorForProgram(c.title);
            const isActive = selectedCourse === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCourse(c.id)}
                title={c.title}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                <span className="flex-1 text-left truncate">{c.title}</span>
                <span className="text-xs text-slate-400 shrink-0">
                  {countsByCourse[c.id] ?? 0}
                </span>
              </button>
            );
          })}
        </aside>

        {/* FEED */}
        <section className="min-w-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center bg-cream/40 rounded-2xl border border-cream-deep">
              <IoChatbubbleEllipsesOutline size={40} className="mx-auto text-terra-soft mb-3" />
              <p className="text-slate-600 font-serif italic">
                {search ? 'Nada acá. Probá con otra palabra.' : 'Acá empieza la primera conversación. ¿Querés abrirla vos?'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map(post => {
                const isExpanded = expandedPost === post.id;
                const course = courseById[post.course_id];
                const courseTitle = course?.title;
                const color = courseTitle ? colorForProgram(courseTitle) : null;
                const sectionTag = getSectionTag(post);
                const isVerifiedTag = post.lesson_id != null;

                return (
                  <li
                    key={post.id}
                    className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-l-4 ${
                      color ? color.border : 'border-l-slate-300'
                    }`}
                  >
                    {/* Row */}
                    <div
                      className="px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                    >
                      <div className="flex gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor(post.user_id)}`}>
                          {initials(post.author_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Tags row */}
                          <div className="flex items-center flex-wrap gap-1.5 mb-1">
                            {courseTitle && color && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${color.chip}`}>
                                {courseTitle}
                              </span>
                            )}
                            {sectionTag && (
                              <span
                                title={isVerifiedTag && post.lessonTitle ? post.lessonTitle : undefined}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  isVerifiedTag
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <IoLayersOutline size={11} /> {sectionTag}
                              </span>
                            )}
                          </div>
                          {post.title && (
                            <h3 className="font-bold text-slate-900 text-base leading-tight">{post.title}</h3>
                          )}
                          <p className="text-sm text-slate-600 line-clamp-2 mt-1">{post.body}</p>
                          <div className="flex items-center flex-wrap gap-3 text-xs font-medium text-slate-500 mt-2">
                            <span className="font-semibold text-slate-700">{post.author_name}</span>
                            <span>·</span>
                            <span>{timeAgo(post.created_at)}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <IoChatbubbleEllipsesOutline size={14} />
                              {post.replies.length} {post.replies.length === 1 ? 'respuesta' : 'respuestas'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded replies */}
                    {isExpanded && (
                      <div className="bg-slate-50/70 border-t border-slate-100 px-5 pb-4">
                        <div className="py-4 text-slate-700 text-sm whitespace-pre-line border-b border-slate-100 mb-4">
                          {post.body}
                        </div>

                        {post.replies.length > 0 && (
                          <div className="space-y-3 mb-4">
                            {post.replies.map(reply => (
                              <div key={reply.id} className="flex gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${avatarColor(reply.user_id)}`}>
                                  {initials(reply.author_name)}
                                </div>
                                <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-700">{reply.author_name}</span>
                                    <span className="text-xs text-slate-400">{timeAgo(reply.created_at)}</span>
                                  </div>
                                  <p className="text-sm text-slate-700 whitespace-pre-line">{reply.body}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {replyingTo === post.id ? (
                          <div className="flex gap-3 items-end">
                            <IoPersonCircleOutline size={32} className="text-slate-400 shrink-0 mb-1" />
                            <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3">
                              <textarea
                                ref={replyRef}
                                rows={3}
                                value={replyBody}
                                onChange={e => setReplyBody(e.target.value)}
                                placeholder="Lo que quieras compartir..."
                                className="w-full text-sm text-slate-700 resize-none focus:outline-none"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={() => { setReplyingTo(null); setReplyBody(''); }}
                                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleReply(post.id)}
                                  disabled={isPending || !replyBody.trim()}
                                  className="flex items-center gap-1.5 text-xs font-bold bg-[#00A9CE] disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
                                >
                                  <IoSendOutline size={14} /> Responder
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setReplyingTo(post.id); setTimeout(() => replyRef.current?.focus(), 50); }}
                            className="text-xs font-bold text-[#00A9CE] hover:underline"
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
        </section>
      </div>

      {/* NEW POST MODAL */}
      {showNewPost && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Abrir conversación</h2>
              <button onClick={() => setShowNewPost(false)} className="text-slate-400 hover:text-slate-700">
                <IoCloseOutline size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {courses.length > 1 && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Programa</label>
                  <select
                    value={newCourse}
                    onChange={e => setNewCourse(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] text-slate-900"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Título (opcional)</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="¿De qué querés hablar?"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Lo que querés compartir <span className="text-red-500">*</span></label>
                <textarea
                  rows={5}
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  placeholder="Lo que estés atravesando, lo que descubriste, lo que te abrió una pregunta..."
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] text-slate-900 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Tip: si mencionás "Módulo 2" o "Clase 3" en el texto, lo etiquetamos solo.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={() => setShowNewPost(false)}
                className="px-5 py-2.5 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleNewPost}
                disabled={isPending || !newBody.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#00A9CE] hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
              >
                <IoSendOutline size={16} /> Compartir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
