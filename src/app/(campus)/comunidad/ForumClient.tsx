'use client';

import { useState, useTransition, useRef } from 'react';
import {
  IoPeopleOutline,
  IoChatbubbleEllipsesOutline,
  IoSearchOutline,
  IoSendOutline,
  IoCloseOutline,
  IoPersonCircleOutline,
  IoAddOutline,
} from 'react-icons/io5';
import { createClient } from '@/utils/supabase/client';

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
  const n = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
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

  // Filter
  const rootPosts = posts.filter(p => p.parent_id === null);
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
    const supabase = createClient();
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
        const courseName = courses.find(c => c.id === newCourse)?.title ?? 'Programa';
        const newPostObj: ForumPost = {
          ...data,
          author_name: 'Vos', // optimistic
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
    const supabase = createClient();
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

  return (
    <>
      {/* HEADER */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <IoPeopleOutline className="text-[#00A9CE]" /> Comunidad
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Conectá, compartí y aprendé con otros estudiantes.</p>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="flex items-center gap-2 bg-[#00A9CE] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm shrink-0"
        >
          <IoAddOutline size={18} /> Nuevo Debate
        </button>
      </section>

      {/* FILTERS */}
      <section className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex bg-slate-200 p-1 rounded-lg w-fit overflow-x-auto">
          <button
            onClick={() => setSelectedCourse('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${
              selectedCourse === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            General
          </button>
          {courses.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${
                selectedCourse === c.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-full px-4 py-2 w-full md:w-64">
          <IoSearchOutline className="text-slate-400 shrink-0" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar temas..."
            className="bg-transparent border-none outline-none flex-1 ml-2 text-sm text-slate-700"
          />
        </div>
      </section>

      {/* POST LIST */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <IoChatbubbleEllipsesOutline size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              {search ? 'No se encontraron debates.' : 'Sé el primero en iniciar un debate.'}
            </p>
          </div>
        ) : (
          filtered.map(post => {
            const isExpanded = expandedPost === post.id;
            const courseTitle = courses.find(c => c.id === post.course_id)?.title;
            return (
              <div key={post.id}>
                {/* Post row */}
                <div
                  className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                >
                  <div className="flex gap-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor(post.user_id)}`}>
                      {initials(post.author_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {post.title && (
                        <h3 className="font-bold text-slate-900 mb-1 text-base">{post.title}</h3>
                      )}
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{post.body}</p>
                      <div className="flex items-center flex-wrap gap-3 text-xs font-medium text-slate-400">
                        <span className="text-[#00A9CE] font-bold">{post.author_name}</span>
                        <span>{timeAgo(post.created_at)}</span>
                        {courseTitle && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">{courseTitle}</span>
                        )}
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
                  <div className="bg-slate-50/70 border-t border-slate-100 px-6 pb-4">
                    {/* Full body */}
                    <div className="py-4 text-slate-700 text-sm whitespace-pre-line border-b border-slate-100 mb-4">
                      {post.body}
                    </div>

                    {/* Replies */}
                    {post.replies.length > 0 && (
                      <div className="space-y-4 mb-4">
                        {post.replies.map(reply => (
                          <div key={reply.id} className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${avatarColor(reply.user_id)}`}>
                              {initials(reply.author_name)}
                            </div>
                            <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-[#00A9CE]">{reply.author_name}</span>
                                <span className="text-xs text-slate-400">{timeAgo(reply.created_at)}</span>
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-line">{reply.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    {replyingTo === post.id ? (
                      <div className="flex gap-3 items-end">
                        <IoPersonCircleOutline size={32} className="text-slate-400 shrink-0 mb-1" />
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3">
                          <textarea
                            ref={replyRef}
                            rows={3}
                            value={replyBody}
                            onChange={e => setReplyBody(e.target.value)}
                            placeholder="Escribí tu respuesta..."
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
                        + Responder
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* NEW POST MODAL */}
      {showNewPost && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Nuevo Debate</h2>
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
                <label className="block text-sm font-bold text-slate-700 mb-2">Mensaje <span className="text-red-500">*</span></label>
                <textarea
                  rows={5}
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  placeholder="Escribí tu mensaje aquí..."
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] text-slate-900 resize-none"
                />
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
                <IoSendOutline size={16} /> Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
