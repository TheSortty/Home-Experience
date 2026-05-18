'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabaseClient';
import { restSelect, restInsert, restUpdate, restDelete } from '../../../services/supabaseRest';
import { normalizeImageUrl } from '../../../services/imageUrl';
import { logEvent, getMyActorInfo } from '../../../services/activityEvents';
import CoachAssignmentsPanel from './CoachAssignmentsPanel';
import {
  IoAddOutline, IoTrashOutline, IoPencilOutline, IoChevronDownOutline,
  IoChevronForwardOutline, IoEyeOutline, IoEyeOffOutline, IoArrowBackOutline,
  IoBookOutline, IoCloseOutline, IoCheckmarkOutline, IoLinkOutline,
  IoVideocamOutline, IoDocumentTextOutline, IoReorderFourOutline,
  IoCalendarOutline, IoTimeOutline,
} from 'react-icons/io5';

// ─── Types ────────────────────────────────────────────────────────────────────

type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  created_at: string;
};

type Module = {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  is_published: boolean;
};

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number;
  order_index: number;
  is_published: boolean;
};

type LessonResource = {
  id: string;
  lesson_id: string;
  title: string;
  file_url: string;
  type: string;
};

type LessonVideoRow = {
  id: string;
  lesson_id: string;
  title: string | null;
  video_url: string;
  duration_seconds: number;
  order_index: number;
};

type Cycle = { id: string; name: string; course_id: string | null };

type CourseSession = {
  id: string;
  course_id: string;
  session_date: string;
  session_time: string | null;
  label: string | null;
  description: string | null;
  location_url: string | null;
  is_mandatory: boolean;
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-[#00A9CE]' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] focus:border-transparent text-slate-900 text-sm';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';

// ─── Course Modal ─────────────────────────────────────────────────────────────

function CourseModal({
  course,
  onClose,
  onSaved,
}: {
  course: Course | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(course?.title ?? '');
  const [desc, setDesc] = useState(course?.description ?? '');
  const [coverUrl, setCoverUrl] = useState(course?.cover_image_url ?? '');
  const [published, setPublished] = useState(course?.is_published ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(), description: desc.trim() || null,
        cover_image_url: coverUrl.trim() || null, is_published: published,
      };

      if (course) {
        await restUpdate('courses', payload, { id: `eq.${course.id}` });
      } else {
        await restInsert('courses', payload, { returning: 'minimal' });
      }

      toast.success(course ? 'Curso actualizado.' : 'Curso creado.');
      onSaved();
    } catch (err: any) {
      console.error('[CourseModal] Unexpected error:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">{course ? 'Editar Curso' : 'Nuevo Curso'}</h2>
          <button onClick={onClose}><IoCloseOutline size={22} className="text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Título *</label>
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Programa Inicial de Coaching" />
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea rows={3} className={inputCls} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>URL de imagen de portada</label>
            <input className={inputCls} value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Publicado (visible para alumnos)</label>
            <Toggle checked={published} onChange={setPublished} />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 bg-[#00A9CE] text-white text-sm font-bold rounded-lg disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Module Modal ─────────────────────────────────────────────────────────────

function ModuleModal({
  mod,
  courseId,
  nextOrder,
  onClose,
  onSaved,
}: {
  mod: Module | null;
  courseId: string;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(mod?.title ?? '');
  const [order, setOrder] = useState(mod?.order_index ?? nextOrder);
  const [published, setPublished] = useState(mod?.is_published ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = { title: title.trim(), order_index: order, is_published: published };

      if (mod) {
        await restUpdate('modules', payload, { id: `eq.${mod.id}` });
      } else {
        await restInsert('modules', { course_id: courseId, ...payload }, { returning: 'minimal' });
      }

      toast.success(mod ? 'Módulo actualizado.' : 'Módulo creado.');
      onSaved();
    } catch (err: any) {
      console.error('[ModuleModal] Unexpected error:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">{mod ? 'Editar Módulo' : 'Nuevo Módulo'}</h2>
          <button onClick={onClose}><IoCloseOutline size={22} className="text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Título *</label>
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Módulo 1 — Fundamentos" />
          </div>
          <div>
            <label className={labelCls}>Orden</label>
            <input type="number" min={1} className={inputCls} value={order} onChange={e => setOrder(Number(e.target.value))} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Visible para alumnos</label>
            <Toggle checked={published} onChange={setPublished} />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} className="px-4 py-2 bg-[#00A9CE] text-white text-sm font-bold rounded-lg disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lesson Modal ─────────────────────────────────────────────────────────────

function LessonModal({
  lesson,
  moduleId,
  nextOrder,
  onClose,
  onSaved,
}: {
  lesson: Lesson | null;
  moduleId: string;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [desc, setDesc] = useState(lesson?.description ?? '');
  const [order, setOrder] = useState(lesson?.order_index ?? nextOrder);
  const [published, setPublished] = useState(lesson?.is_published ?? false);

  // ── Videos (multi-video) ──────────────────────────────────────────────────
  const [videos, setVideos] = useState<LessonVideoRow[]>([]);
  const [pendingVideos, setPendingVideos] = useState<{ url: string; title: string; duration: number }[]>([]);
  const [newVidUrl, setNewVidUrl] = useState('');
  const [newVidTitle, setNewVidTitle] = useState('');
  const [newVidDuration, setNewVidDuration] = useState(0);

  // ── Resources ─────────────────────────────────────────────────────────────
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [pendingResources, setPendingResources] = useState<{ title: string; url: string; type: string }[]>([]);
  const [newResTitle, setNewResTitle] = useState('');
  const [newResUrl, setNewResUrl] = useState('');
  const [newResType, setNewResType] = useState('link');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lesson) return;
    restSelect<LessonResource>('lesson_resources', { filters: { lesson_id: `eq.${lesson.id}` } })
      .then(({ data }) => setResources(data))
      .catch(err => console.error('[LessonModal] Failed to load resources:', err));
    restSelect<LessonVideoRow>('lesson_videos', {
      filters: { lesson_id: `eq.${lesson.id}` },
      order: 'order_index.asc',
    })
      .then(({ data }) => {
        setVideos(data);
        // If no lesson_videos yet but lesson has video_url, seed from legacy field
        if (data.length === 0 && lesson.video_url) {
          setPendingVideos([{ url: lesson.video_url, title: '', duration: lesson.duration_seconds ?? 0 }]);
        }
      })
      .catch(err => console.error('[LessonModal] Failed to load videos:', err));
  }, [lesson?.id]);

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      setSaving(true);

      // Build the full video list: existing (already in DB) + pending
      const allVideos = [...pendingVideos];
      if (newVidUrl.trim()) {
        allVideos.push({ url: newVidUrl.trim(), title: newVidTitle.trim(), duration: newVidDuration });
      }

      // Derive legacy fields from first video for backward-compat
      const allExistingAndPending = [...videos, ...allVideos.map((v, i) => ({
        id: '', lesson_id: '', title: v.title || null,
        video_url: v.url, duration_seconds: v.duration, order_index: videos.length + i + 1,
      }))];
      const firstVideoUrl = allExistingAndPending[0]?.video_url ?? null;
      const totalDuration = allExistingAndPending.reduce((s, v) => s + (v.duration_seconds ?? 0), 0);

      const payload = {
        title: title.trim(),
        description: desc.trim() || null,
        video_url: firstVideoUrl,
        duration_seconds: totalDuration,
        order_index: order,
        is_published: published,
      };

      let lessonId = lesson?.id;
      const wasPublished = lesson?.is_published === true;

      if (lessonId) {
        await restUpdate('lessons', payload, { id: `eq.${lessonId}` });
      } else {
        const created = await restInsert<Lesson>('lessons', { module_id: moduleId, ...payload });
        lessonId = created?.id;
      }

      // Save pending videos to lesson_videos table
      const videosToSave = [...allVideos];
      if (videosToSave.length > 0 && lessonId) {
        try {
          const nextOrder = videos.length + 1;
          await restInsert(
            'lesson_videos',
            videosToSave.map((v, i) => ({
              lesson_id: lessonId!,
              title: v.title || null,
              video_url: v.url,
              duration_seconds: Math.round(v.duration),
              order_index: nextOrder + i,
            })),
            { returning: 'minimal' }
          );
        } catch (vidErr: any) {
          toast.error('Error al guardar videos: ' + vidErr.message);
        }
      }

      // Save pending resources (typed but not clicked "Agregar")
      const resourcesToSave = [...pendingResources];
      if (newResTitle.trim() && newResUrl.trim()) {
        resourcesToSave.push({ title: newResTitle.trim(), url: newResUrl.trim(), type: newResType });
      }
      if (resourcesToSave.length > 0 && lessonId) {
        try {
          await restInsert(
            'lesson_resources',
            resourcesToSave.map(r => ({
              lesson_id: lessonId!, title: r.title, file_url: r.url, type: r.type,
            })),
            { returning: 'minimal' }
          );
        } catch (resErr: any) {
          toast.error('Error al guardar materiales: ' + resErr.message);
        }
      }

      // Bandeja events
      const actor = await getMyActorInfo();
      if (actor && lessonId) {
        const justPublished = published && !wasPublished;
        if (justPublished) {
          await logEvent({
            type: 'content.lesson_published',
            actorProfileId: actor.profileId,
            actorRole: actor.role,
            targetKind: 'lesson',
            targetId: lessonId,
            details: {
              actorName: actor.name,
              lessonTitle: title.trim(),
              hasVideo: !!firstVideoUrl,
              durationSeconds: totalDuration,
            },
          });
        }
        for (const r of resourcesToSave) {
          await logEvent({
            type: 'content.material_published',
            actorProfileId: actor.profileId,
            actorRole: actor.role,
            targetKind: 'lesson_resource',
            details: {
              actorName: actor.name,
              materialTitle: r.title,
              materialType: r.type,
              lessonId,
              lessonTitle: title.trim(),
            },
          });
        }
      }

      toast.success(lesson ? 'Clase actualizada.' : 'Clase creada.');
      onSaved();
    } catch (err: any) {
      console.error('[LessonModal] Save error:', err);
      toast.error(`Error: ${err?.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  const addResource = async () => {
    if (!newResTitle.trim() || !newResUrl.trim()) return;

    if (!lesson) {
      // Adding to pending list before saving the lesson
      setPendingResources(prev => [...prev, { title: newResTitle.trim(), url: newResUrl.trim(), type: newResType }]);
      setNewResTitle('');
      setNewResUrl('');
      return;
    }

    try {
      const data = await restInsert<LessonResource>('lesson_resources', {
        lesson_id: lesson.id, title: newResTitle.trim(), file_url: newResUrl.trim(), type: newResType,
      });
      if (data) { setResources(prev => [...prev, data]); setNewResTitle(''); setNewResUrl(''); }
      toast.success('Material agregado');

      // Bandeja event: staff published a new support material.
      const actor = await getMyActorInfo();
      if (actor && data) {
        await logEvent({
          type: 'content.material_published',
          actorProfileId: actor.profileId,
          actorRole: actor.role,
          targetKind: 'lesson_resource',
          targetId: data.id,
          details: {
            actorName: actor.name,
            materialTitle: newResTitle.trim(),
            materialType: newResType,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
          },
        });
      }
    } catch (err: any) {
      toast.error('Error al agregar material: ' + err.message);
    }
  };

  const deleteResource = async (id: string) => {
    try {
      await restDelete('lesson_resources', { id: `eq.${id}` });
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Material eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0">
          <h2 className="font-bold text-slate-900">{lesson ? 'Editar Clase' : 'Nueva Clase'}</h2>
          <button onClick={onClose}><IoCloseOutline size={22} className="text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Título *</label>
              <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Introducción al Coaching Ontológico" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Descripción / Contenido de la clase</label>
              <textarea rows={4} className={inputCls} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Si la clase es solo de lectura, usá este campo para el contenido completo." />
            </div>
            <div className="col-span-2">
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <IoVideocamOutline size={16} /> Videos
                  <span className="text-xs text-slate-400 font-normal ml-1">(si hay más de uno se muestra un carrusel)</span>
                </h3>

                {/* Existing videos */}
                {videos.map((v, idx) => (
                  <div key={v.id} className="flex items-center gap-2 mb-2 bg-slate-50 rounded-lg p-2">
                    <IoVideocamOutline size={14} className="text-[#00A9CE] shrink-0" />
                    <span className="text-xs text-slate-500 shrink-0 font-bold w-4">{idx + 1}.</span>
                    <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-[#00A9CE] truncate hover:underline">
                      {v.title || v.video_url}
                    </a>
                    {v.duration_seconds > 0 && (
                      <span className="text-xs text-slate-400 shrink-0">
                        {Math.floor(v.duration_seconds / 60)}min
                      </span>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          await restDelete('lesson_videos', { id: `eq.${v.id}` });
                          setVideos(prev => prev.filter(x => x.id !== v.id));
                          toast.success('Video eliminado');
                        } catch (e: any) { toast.error('Error: ' + e.message); }
                      }}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      <IoTrashOutline size={14} />
                    </button>
                  </div>
                ))}

                {/* Pending videos */}
                {pendingVideos.map((v, idx) => (
                  <div key={`pv-${idx}`} className="flex items-center gap-2 mb-2 bg-amber-50/50 border border-amber-100 rounded-lg p-2">
                    <IoVideocamOutline size={14} className="text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-500 shrink-0 font-bold w-4">{videos.length + idx + 1}.</span>
                    <span className="flex-1 text-sm text-slate-700 truncate">
                      {v.title || v.url}
                      <span className="text-[10px] uppercase font-bold text-amber-500 opacity-60 ml-1">(pendiente)</span>
                    </span>
                    {v.duration > 0 && <span className="text-xs text-slate-400 shrink-0">{Math.floor(v.duration / 60)}min</span>}
                    <button onClick={() => setPendingVideos(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 shrink-0">
                      <IoTrashOutline size={14} />
                    </button>
                  </div>
                ))}

                {videos.length === 0 && pendingVideos.length === 0 && (
                  <p className="text-xs text-slate-400 italic mb-3">Sin videos todavía. Dejá vacío para clase de solo lectura.</p>
                )}

                {/* Add video row */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-2">
                  <input
                    className={`sm:col-span-3 ${inputCls}`}
                    value={newVidUrl}
                    onChange={e => setNewVidUrl(e.target.value)}
                    placeholder="URL del video (YouTube...)"
                  />
                  <input
                    className={`sm:col-span-1 ${inputCls}`}
                    value={newVidTitle}
                    onChange={e => setNewVidTitle(e.target.value)}
                    placeholder="Título (opcional)"
                  />
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={newVidDuration || ''}
                    onChange={e => setNewVidDuration(Number(e.target.value))}
                    placeholder="Duración (seg)"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!newVidUrl.trim()) return;
                    setPendingVideos(prev => [...prev, { url: newVidUrl.trim(), title: newVidTitle.trim(), duration: newVidDuration }]);
                    setNewVidUrl(''); setNewVidTitle(''); setNewVidDuration(0);
                  }}
                  disabled={!newVidUrl.trim()}
                  className="mt-2 flex items-center gap-1 text-xs font-bold text-[#00A9CE] hover:underline disabled:opacity-40"
                >
                  <IoAddOutline size={14} /> Agregar video
                </button>
              </div>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Orden</label>
                <input type="number" min={1} className={inputCls} value={order} onChange={e => setOrder(Number(e.target.value))} />
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Visible para alumnos</label>
              <Toggle checked={published} onChange={setPublished} />
            </div>
          </div>

          {/* Resources */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <IoDocumentTextOutline size={16} /> Materiales de apoyo
            </h3>
            
            {/* Existing resources */}
            {resources.map(r => {
              const url = r.file_url.toLowerCase();
              let iconColor = 'text-[#00A9CE]';
              if (url.endsWith('.pdf') || r.type === 'pdf') iconColor = 'text-red-500';
              else if (url.endsWith('.doc') || url.endsWith('.docx')) iconColor = 'text-blue-600';
              else if (url.endsWith('.xls') || url.endsWith('.xlsx') || url.endsWith('.csv')) iconColor = 'text-emerald-600';
              else if (url.endsWith('.ppt') || url.endsWith('.pptx')) iconColor = 'text-orange-600';

              return (
                <div key={r.id} className="flex items-center gap-2 mb-2 bg-slate-50 rounded-lg p-2">
                  <IoDocumentTextOutline size={14} className={`${iconColor} shrink-0`} />
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer" className={`flex-1 text-sm ${iconColor} truncate hover:underline`}>{r.title}</a>
                  <span className="text-xs text-slate-400 shrink-0">{r.type}</span>
                  <button onClick={() => deleteResource(r.id)} className="text-red-400 hover:text-red-600 shrink-0">
                    <IoTrashOutline size={14} />
                  </button>
                </div>
              );
            })}

            {/* Pending resources (not yet saved in DB) */}
            {pendingResources.map((r, idx) => {
              const url = r.url.toLowerCase();
              let iconColor = 'text-amber-400';
              if (url.endsWith('.pdf') || r.type === 'pdf') iconColor = 'text-red-400';
              else if (url.endsWith('.doc') || url.endsWith('.docx')) iconColor = 'text-blue-400';
              else if (url.endsWith('.xls') || url.endsWith('.xlsx') || url.endsWith('.csv')) iconColor = 'text-emerald-400';
              else if (url.endsWith('.ppt') || url.endsWith('.pptx')) iconColor = 'text-orange-400';

              return (
                <div key={`pending-${idx}`} className="flex items-center gap-2 mb-2 bg-amber-50/50 border border-amber-100 rounded-lg p-2">
                  <IoDocumentTextOutline size={14} className={`${iconColor} shrink-0`} />
                  <span className="flex-1 text-sm text-slate-700 truncate">{r.title} <span className="text-[10px] uppercase font-bold text-amber-500 opacity-60">(pendiente)</span></span>
                  <span className="text-xs text-slate-400 shrink-0">{r.type}</span>
                  <button onClick={() => setPendingResources(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 shrink-0">
                    <IoTrashOutline size={14} />
                  </button>
                </div>
              );
            })}

            {resources.length === 0 && pendingResources.length === 0 && (
              <p className="text-xs text-slate-400 italic mb-3">No hay materiales todavía.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-3">
              <input className={`sm:col-span-2 ${inputCls}`} value={newResTitle} onChange={e => setNewResTitle(e.target.value)} placeholder="Nombre del material" />
              <input className={`sm:col-span-2 ${inputCls}`} value={newResUrl} onChange={e => setNewResUrl(e.target.value)} placeholder="URL de Material (Google Drive Public Link)" />
              <select className={inputCls} value={newResType} onChange={e => setNewResType(e.target.value)}>
                <option value="link">Link</option>
                <option value="pdf">PDF</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            <button
              onClick={addResource}
              disabled={!newResTitle.trim() || !newResUrl.trim()}
              className="mt-2 flex items-center gap-1 text-xs font-bold text-[#00A9CE] hover:underline disabled:opacity-40"
            >
              <IoAddOutline size={14} /> Agregar material
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} className="px-4 py-2 bg-[#00A9CE] text-white text-sm font-bold rounded-lg disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminCourses() {
  // Courses list
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Selected course detail
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [allCycles, setAllCycles] = useState<Cycle[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  // Modals
  const [courseModal, setCourseModal] = useState<{ open: boolean; course: Course | null }>({ open: false, course: null });
  const [moduleModal, setModuleModal] = useState<{ open: boolean; mod: Module | null; courseId: string } | null>(null);
  const [lessonModal, setLessonModal] = useState<{ open: boolean; lesson: Lesson | null; moduleId: string } | null>(null);
  const [courseSessions, setCourseSessions] = useState<CourseSession[]>([]);
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('');
  const [newSessionLabel, setNewSessionLabel] = useState('');
  const [newSessionLocation, setNewSessionLocation] = useState('');
  const [newSessionMandatory, setNewSessionMandatory] = useState(true);
  const [savingSession, setSavingSession] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const fetchData = useCallback(async (_isBackgroundRefresh = false) => {
    const isFirstLoad = !hasLoadedOnceRef.current;
    if (isFirstLoad) setLoadingCourses(true);

    try {
      const results = await Promise.allSettled([
        restSelect<Course>('courses', { order: 'created_at.desc' }),
        restSelect<Module>('modules', { order: 'order_index.asc' }),
        restSelect<Lesson>('lessons', { order: 'order_index.asc' }),
        restSelect<Cycle>('cycles', { columns: 'id,name,course_id', order: 'name.asc' }),
        restSelect<CourseSession>('course_sessions', { order: 'session_date.asc' }),
      ]);

      const get = (res: PromiseSettledResult<{ data: any[] }>) => res.status === 'fulfilled' ? res.value.data : null;

      const coursesData = get(results[0]);
      const modulesData = get(results[1]);
      const lessonsData = get(results[2]);
      const cyclesData = get(results[3]);
      const sessionsData = get(results[4]);

      if (coursesData) setCourses(coursesData as Course[]);
      if (modulesData) setModules(modulesData as Module[]);
      if (lessonsData) setLessons(lessonsData as Lesson[]);
      if (cyclesData) setAllCycles(cyclesData as Cycle[]);
      if (sessionsData) setCourseSessions(sessionsData as CourseSession[]);

      hasLoadedOnceRef.current = true;
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (isFirstLoad) setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channelName = 'courses_changes_stable';
    
    // Limpiar canal previo si existe (evita TIMED_OUT en React StrictMode)
    supabase.getChannels().forEach(ch => {
      if (ch.topic.includes(channelName)) supabase.removeChannel(ch);
    });

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modules' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cycles' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_sessions' }, () => fetchData(true))
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchData]);

  const openCourse = (course: Course) => {
    setSelectedCourse(course);
    setExpandedModule(null);
  };

  const backToList = () => { setSelectedCourse(null); };

  const deleteCourse = async (id: string) => {
    if (!confirm('¿Eliminar este curso y todo su contenido?')) return;
    try {
      await restDelete('courses', { id: `eq.${id}` });
      setCourses(prev => prev.filter(c => c.id !== id));
      if (selectedCourse?.id === id) backToList();
      toast.success('Curso eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar curso: ' + err.message);
    }
  };

  const deleteModule = async (id: string) => {
    if (!confirm('¿Eliminar este módulo y todas sus clases?')) return;
    try {
      await restDelete('modules', { id: `eq.${id}` });
      setModules(prev => prev.filter(m => m.id !== id));
      toast.success('Módulo eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar módulo: ' + err.message);
    }
  };

  const deleteLesson = async (id: string) => {
    if (!confirm('¿Eliminar esta clase?')) return;
    try {
      await restDelete('lessons', { id: `eq.${id}` });
      setLessons(prev => prev.filter(l => l.id !== id));
      toast.success('Clase eliminada');
    } catch (err: any) {
      toast.error('Error al eliminar clase: ' + err.message);
    }
  };

  const toggleLessonPublished = async (lesson: Lesson) => {
    try {
      await restUpdate('lessons', { is_published: !lesson.is_published }, { id: `eq.${lesson.id}` });
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, is_published: !l.is_published } : l));
      toast.success('Estado actualizado');
    } catch (err: any) {
      toast.error('Error al actualizar estado: ' + err.message);
    }
  };

  const linkCycle = async (cycleId: string) => {
    if (!selectedCourse) return;
    try {
      await restUpdate('cycles', { course_id: selectedCourse.id }, { id: `eq.${cycleId}` });
      fetchData(true);
      toast.success('Programa vinculado');
    } catch (err: any) {
      toast.error('Error al vincular: ' + err.message);
    }
  };

  const unlinkCycle = async (cycleId: string) => {
    try {
      await restUpdate('cycles', { course_id: null }, { id: `eq.${cycleId}` });
      fetchData(true);
      toast.success('Programa desvinculado');
    } catch (err: any) {
      toast.error('Error al desvincular: ' + err.message);
    }
  };

  const addCourseSession = async () => {
    if (!selectedCourse || !newSessionDate) {
      toast.error('Faltá una fecha');
      return;
    }
    setSavingSession(true);
    try {
      const created = await restInsert<{ id: string }>('course_sessions', {
        course_id: selectedCourse.id,
        session_date: newSessionDate,
        session_time: newSessionTime || null,
        label: newSessionLabel.trim() || null,
        location_url: newSessionLocation.trim() || null,
        is_mandatory: newSessionMandatory,
      });

      // Bandeja event — encuentro programado.
      const actor = await getMyActorInfo();
      if (actor) {
        await logEvent({
          type: 'content.session_scheduled',
          actorProfileId: actor.profileId,
          actorRole: actor.role,
          targetKind: 'course_session',
          targetId: created?.id ?? null,
          details: {
            actorName: actor.name,
            courseId: selectedCourse.id,
            courseTitle: selectedCourse.title,
            sessionDate: newSessionDate,
            sessionTime: newSessionTime || null,
            label: newSessionLabel.trim() || null,
            isMandatory: newSessionMandatory,
          },
        });
      }

      setNewSessionDate('');
      setNewSessionTime('');
      setNewSessionLabel('');
      setNewSessionLocation('');
      setNewSessionMandatory(true);
      fetchData(true);
      toast.success('Encuentro agregado');
    } catch (err: any) {
      toast.error('Error al agregar encuentro: ' + err.message);
    } finally {
      setSavingSession(false);
    }
  };

  const deleteCourseSession = async (sessionId: string) => {
    if (!confirm('¿Eliminar este encuentro?')) return;
    try {
      await restDelete('course_sessions', { id: `eq.${sessionId}` });
      setCourseSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Encuentro eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar encuentro: ' + err.message);
    }
  };

  const linkedCycles = selectedCourse ? allCycles.filter(c => c.course_id === selectedCourse.id) : [];
  const unlinkedCycles = selectedCourse ? allCycles.filter(c => !c.course_id || c.course_id !== selectedCourse.id) : [];
  const courseSessionsForSelected = selectedCourse
    ? courseSessions
        .filter(s => s.course_id === selectedCourse.id)
        .sort((a, b) => a.session_date.localeCompare(b.session_date))
    : [];

  // ── Courses List View ────────────────────────────────────────────────────────

  if (!selectedCourse) {
    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Gestión de Cursos LMS</h2>
            <p className="text-sm text-slate-500 mt-0.5">Administrá cursos, módulos, clases y materiales.</p>
          </div>
          <button
            onClick={() => setCourseModal({ open: true, course: null })}
            className="flex items-center gap-2 bg-[#00A9CE] text-white px-4 py-2 rounded-lg font-bold text-sm"
          >
            <IoAddOutline size={18} /> Nuevo Curso
          </button>
        </div>

        {loadingCourses && courses.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Cargando cursos...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <IoBookOutline size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Sin cursos todavía.</p>
            <p className="text-sm">Creá el primer curso para empezar a agregar contenido.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {courses.map(course => (
              <div
                key={course.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="h-28 bg-gradient-to-br from-[#00A9CE] to-blue-600 cursor-pointer relative"
                  style={(() => {
                    const src = normalizeImageUrl(course.cover_image_url, 'w400');
                    return src ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};
                  })()}
                  onClick={() => openCourse(course)}
                >
                  <div className={`absolute top-2 right-2 px-2 py-0.5 text-xs font-bold rounded-full ${course.is_published ? 'bg-emerald-500 text-white' : 'bg-slate-700/80 text-white'}`}>
                    {course.is_published ? 'Publicado' : 'Borrador'}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 mb-1 truncate cursor-pointer hover:text-[#00A9CE]" onClick={() => openCourse(course)}>
                    {course.title}
                  </h3>
                  {course.description && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{course.description}</p>}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button onClick={() => openCourse(course)} className="text-xs font-bold text-[#00A9CE] hover:underline flex items-center gap-1">
                      Gestionar contenido <IoChevronForwardOutline size={12} />
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => setCourseModal({ open: true, course })} className="p-1.5 text-slate-400 hover:text-[#00A9CE] rounded">
                        <IoPencilOutline size={15} />
                      </button>
                      <button onClick={() => deleteCourse(course.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
                        <IoTrashOutline size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {courseModal.open && (
          <CourseModal
            course={courseModal.course}
            onClose={() => setCourseModal({ open: false, course: null })}
            onSaved={() => { setCourseModal({ open: false, course: null }); fetchData(); }}
          />
        )}
      </>
    );
  }

  // ── Course Detail View ───────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={backToList} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
          <IoArrowBackOutline size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 truncate">{selectedCourse.title}</h2>
          <p className="text-sm text-slate-500">{modules.filter(m => m.course_id === selectedCourse.id).length} módulos · {lessons.filter(l => modules.filter(m => m.course_id === selectedCourse.id).map(m => m.id).includes(l.module_id)).length} clases</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${selectedCourse.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {selectedCourse.is_published ? 'Publicado' : 'Borrador'}
          </span>
          <button onClick={() => setCourseModal({ open: true, course: selectedCourse })} className="p-2 text-slate-400 hover:text-[#00A9CE]">
            <IoPencilOutline size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Modules + Lessons — 2 cols */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-slate-700">Módulos y Clases</h3>
            <button
              onClick={() => setModuleModal({ open: true, mod: null, courseId: selectedCourse.id })}
              className="flex items-center gap-1.5 text-sm font-bold text-[#00A9CE] hover:underline"
            >
              <IoAddOutline size={16} /> Módulo
            </button>
          </div>

          {loadingCourses && modules.filter(m => m.course_id === selectedCourse.id).length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>
          ) : modules.filter(m => m.course_id === selectedCourse.id).length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
              No hay módulos. Creá el primero para comenzar.
            </div>
          ) : (
            modules.filter(m => m.course_id === selectedCourse.id).map(mod => {
              const modLessons = lessons.filter(l => l.module_id === mod.id).sort((a, b) => a.order_index - b.order_index);
              const isOpen = expandedModule === mod.id;
              return (
                <div key={mod.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Module header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedModule(isOpen ? null : mod.id)}
                  >
                    <IoReorderFourOutline size={18} className="text-slate-300" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">Módulo {mod.order_index}</span>
                        {!mod.is_published && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Oculto</span>}
                      </div>
                      <h4 className="font-bold text-slate-900 truncate">{mod.title}</h4>
                    </div>
                    <span className="text-xs text-slate-400 font-medium shrink-0">{modLessons.length} clases</span>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setModuleModal({ open: true, mod, courseId: selectedCourse.id })} className="p-1.5 text-slate-400 hover:text-[#00A9CE]">
                        <IoPencilOutline size={14} />
                      </button>
                      <button onClick={() => deleteModule(mod.id)} className="p-1.5 text-slate-400 hover:text-red-500">
                        <IoTrashOutline size={14} />
                      </button>
                    </div>
                    <IoChevronDownOutline size={16} className={`text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Lessons */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      {modLessons.map((lesson, idx) => (
                        <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 group">
                          <span className="text-xs text-slate-400 font-mono w-4 shrink-0">{idx + 1}</span>
                          <IoVideocamOutline size={14} className="text-slate-300 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{lesson.title}</p>
                            {lesson.duration_seconds > 0 && (
                              <p className="text-xs text-slate-400">
                                {lesson.duration_seconds >= 3600
                                  ? `${Math.floor(lesson.duration_seconds / 3600)}h ${Math.floor((lesson.duration_seconds % 3600) / 60)}min`
                                  : `${Math.floor(lesson.duration_seconds / 60)} min`}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => toggleLessonPublished(lesson)} title={lesson.is_published ? 'Ocultar' : 'Publicar'} className="p-1.5 text-slate-400 hover:text-[#00A9CE]">
                              {lesson.is_published ? <IoEyeOutline size={14} /> : <IoEyeOffOutline size={14} />}
                            </button>
                            <button onClick={() => setLessonModal({ open: true, lesson, moduleId: mod.id })} className="p-1.5 text-slate-400 hover:text-[#00A9CE]">
                              <IoPencilOutline size={14} />
                            </button>
                            <button onClick={() => deleteLesson(lesson.id)} className="p-1.5 text-slate-400 hover:text-red-500">
                              <IoTrashOutline size={14} />
                            </button>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${lesson.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {lesson.is_published ? '✓' : 'borrador'}
                          </span>
                        </div>
                      ))}
                      <div className="px-4 py-2.5">
                        <button
                          onClick={() => setLessonModal({ open: true, lesson: null, moduleId: mod.id })}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#00A9CE] hover:underline"
                        >
                          <IoAddOutline size={14} /> Agregar clase
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">

          {/* Linked cycles */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <IoLinkOutline size={16} className="text-[#00A9CE]" /> Ciclos Vinculados
            </h3>
            <p className="text-xs text-slate-500 mb-3">Los alumnos de estos ciclos verán este curso en su campus.</p>

            {linkedCycles.length === 0 ? (
              <p className="text-xs text-slate-400 italic mb-3">Sin ciclos vinculados.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {linkedCycles.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-slate-800 truncate">{c.name}</span>
                    <button onClick={() => unlinkCycle(c.id)} className="text-slate-400 hover:text-red-500 ml-2 shrink-0">
                      <IoCloseOutline size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {unlinkedCycles.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1.5">Vincular ciclo:</p>
                <div className="space-y-1">
                  {unlinkedCycles.map(c => (
                    <button
                      key={c.id}
                      onClick={() => linkCycle(c.id)}
                      className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg hover:text-[#00A9CE] transition-colors"
                    >
                      <IoAddOutline size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Equipo de coaches */}
          <CoachAssignmentsPanel
            courseId={selectedCourse.id}
            courseTitle={selectedCourse.title}
            linkedCycleIds={linkedCycles.map(c => c.id)}
          />

          {/* Encuentros / Fechas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-bold text-slate-700 mb-1 flex items-center gap-2">
              <IoCalendarOutline size={16} className="text-[#00A9CE]" /> Encuentros del Programa
            </h3>
            <p className="text-xs text-slate-500 mb-3">Fechas que aparecen en el calendario de los alumnos con acceso a este curso.</p>

            {/* Lista de encuentros existentes */}
            {courseSessionsForSelected.length === 0 ? (
              <p className="text-xs text-slate-400 italic mb-3">Sin encuentros agendados todavía.</p>
            ) : (
              <div className="space-y-1.5 mb-3 max-h-64 overflow-y-auto pr-1">
                {courseSessionsForSelected.map(s => {
                  const dateObj = new Date(s.session_date + 'T00:00:00');
                  const dateStr = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
                  const isPast = dateObj.getTime() < Date.now() - 86400000;
                  return (
                    <div key={s.id} className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 ${isPast ? 'bg-slate-50' : 'bg-blue-50/50'}`}>
                      <IoTimeOutline size={14} className={`mt-0.5 shrink-0 ${isPast ? 'text-slate-400' : 'text-[#00A9CE]'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold ${isPast ? 'text-slate-500' : 'text-slate-800'}`}>
                            {dateStr}{s.session_time ? ` · ${s.session_time.slice(0, 5)}` : ''}
                          </span>
                          {!s.is_mandatory && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-bold">OPCIONAL</span>
                          )}
                        </div>
                        {s.label && <p className="text-xs text-slate-600 truncate">{s.label}</p>}
                        {s.location_url && (
                          <a
                            href={s.location_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#00A9CE] hover:underline truncate block"
                            onClick={e => e.stopPropagation()}
                          >
                            🔗 {s.location_url}
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => deleteCourseSession(s.id)}
                        className="text-slate-300 hover:text-red-500 shrink-0 p-1"
                        title="Eliminar encuentro"
                      >
                        <IoTrashOutline size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Formulario para agregar nuevo encuentro */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nuevo encuentro</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={e => setNewSessionDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A9CE]"
                />
                <input
                  type="time"
                  value={newSessionTime}
                  onChange={e => setNewSessionTime(e.target.value)}
                  placeholder="Hora"
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A9CE]"
                />
              </div>
              <input
                type="text"
                value={newSessionLabel}
                onChange={e => setNewSessionLabel(e.target.value)}
                placeholder="Título (ej: Sesión 1 — Apertura)"
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A9CE]"
              />
              <input
                type="url"
                value={newSessionLocation}
                onChange={e => setNewSessionLocation(e.target.value)}
                placeholder="Link (Zoom/Meet/dirección, opcional)"
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A9CE]"
              />
              <label className="flex items-center justify-between text-xs text-slate-700">
                <span>Obligatorio</span>
                <Toggle checked={newSessionMandatory} onChange={setNewSessionMandatory} />
              </label>
              <button
                onClick={addCourseSession}
                disabled={savingSession || !newSessionDate}
                className="w-full flex items-center justify-center gap-1.5 bg-[#00A9CE] text-white text-xs font-bold py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <IoAddOutline size={14} /> {savingSession ? 'Agregando...' : 'Agregar encuentro'}
              </button>
            </div>
          </div>

          {/* Course info summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-bold text-slate-700 mb-3">Estadísticas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Módulos</span><span className="font-bold text-slate-800">{modules.filter(m => m.course_id === selectedCourse.id).length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Clases totales</span><span className="font-bold text-slate-800">{lessons.filter(l => modules.filter(m => m.course_id === selectedCourse.id).map(m => m.id).includes(l.module_id)).length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Clases publicadas</span><span className="font-bold text-emerald-700">{lessons.filter(l => modules.filter(m => m.course_id === selectedCourse.id).map(m => m.id).includes(l.module_id) && l.is_published).length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ciclos vinculados</span><span className="font-bold text-slate-800">{linkedCycles.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Encuentros agendados</span><span className="font-bold text-slate-800">{courseSessionsForSelected.length}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {courseModal.open && (
        <CourseModal
          course={courseModal.course}
          onClose={() => setCourseModal({ open: false, course: null })}
          onSaved={() => {
            setCourseModal({ open: false, course: null });
            fetchData();
            if (selectedCourse && courseModal.course?.id === selectedCourse.id) {
              // Re-fetch updated course
              restSelect<Course>('courses', { filters: { id: `eq.${selectedCourse.id}` }, limit: 1 })
                .then(({ data }) => { if (data[0]) setSelectedCourse(data[0]); })
                .catch(err => console.error('Failed to re-fetch course:', err));
            }
          }}
        />
      )}
      {moduleModal?.open && (
        <ModuleModal
          mod={moduleModal.mod}
          courseId={moduleModal.courseId}
          nextOrder={modules.length + 1}
          onClose={() => setModuleModal(null)}
          onSaved={() => { setModuleModal(null); fetchData(true); }}
        />
      )}
      {lessonModal?.open && (
        <LessonModal
          lesson={lessonModal.lesson}
          moduleId={lessonModal.moduleId}
          nextOrder={lessons.filter(l => l.module_id === lessonModal.moduleId).length + 1}
          onClose={() => setLessonModal(null)}
          onSaved={() => { setLessonModal(null); fetchData(true); }}
        />
      )}
    </>
  );
}
