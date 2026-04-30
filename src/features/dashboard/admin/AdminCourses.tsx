'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabaseClient';
import {
  IoAddOutline, IoTrashOutline, IoPencilOutline, IoChevronDownOutline,
  IoChevronForwardOutline, IoEyeOutline, IoEyeOffOutline, IoArrowBackOutline,
  IoBookOutline, IoCloseOutline, IoCheckmarkOutline, IoLinkOutline,
  IoVideocamOutline, IoDocumentTextOutline, IoReorderFourOutline,
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

type Cycle = { id: string; name: string; course_id: string | null };

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
    const payload = {
      title: title.trim(), description: desc.trim() || null,
      cover_image_url: coverUrl.trim() || null, is_published: published,
    };
    const { error } = course
      ? await supabase.from('courses').update(payload).eq('id', course.id)
      : await supabase.from('courses').insert(payload);
    setSaving(false);
    if (error) { toast.error(`Error al guardar: ${error.message}`); return; }
    toast.success(course ? 'Curso actualizado.' : 'Curso creado.');
    onSaved();
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
    const { error } = mod
      ? await supabase.from('modules').update({ title: title.trim(), order_index: order, is_published: published }).eq('id', mod.id)
      : await supabase.from('modules').insert({ course_id: courseId, title: title.trim(), order_index: order, is_published: published });
    setSaving(false);
    if (error) { toast.error(`Error: ${error.message}`); return; }
    toast.success(mod ? 'Módulo actualizado.' : 'Módulo creado.');
    onSaved();
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
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? '');
  const [duration, setDuration] = useState(lesson?.duration_seconds ?? 0);
  const [order, setOrder] = useState(lesson?.order_index ?? nextOrder);
  const [published, setPublished] = useState(lesson?.is_published ?? false);

  const [resources, setResources] = useState<LessonResource[]>([]);
  const [newResTitle, setNewResTitle] = useState('');
  const [newResUrl, setNewResUrl] = useState('');
  const [newResType, setNewResType] = useState('link');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lesson) {
      supabase.from('lesson_resources').select('*').eq('lesson_id', lesson.id).then(({ data }) => {
        setResources(data || []);
      });
    }
  }, [lesson?.id]);

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      setSaving(true);
      const payload = {
        title: title.trim(), description: desc.trim() || null,
        video_url: videoUrl.trim() || null, duration_seconds: Math.round(duration),
        order_index: order, is_published: published,
      };
      const { error } = lesson
        ? await supabase.from('lessons').update(payload).eq('id', lesson.id)
        : await supabase.from('lessons').insert({ module_id: moduleId, ...payload });
      if (error) throw error;
      toast.success(lesson ? 'Clase actualizada.' : 'Clase creada.');
      onSaved();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addResource = async () => {
    if (!newResTitle.trim() || !newResUrl.trim() || !lesson) return;
    try {
      const { data, error } = await supabase.from('lesson_resources').insert({
        lesson_id: lesson.id, title: newResTitle.trim(), file_url: newResUrl.trim(), type: newResType,
      }).select().single();
      if (error) throw error;
      if (data) { setResources(prev => [...prev, data]); setNewResTitle(''); setNewResUrl(''); }
      toast.success('Material agregado');
    } catch (err: any) {
      toast.error('Error al agregar material: ' + err.message);
    }
  };

  const deleteResource = async (id: string) => {
    try {
      const { error } = await supabase.from('lesson_resources').delete().eq('id', id);
      if (error) throw error;
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
              <label className={labelCls}>Descripción</label>
              <textarea rows={2} className={inputCls} value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>URL del video (YouTube / Vimeo)</label>
              <input className={inputCls} value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div>
              <label className={labelCls}>Duración (segundos)</label>
              <input type="number" min={0} className={inputCls} value={duration} onChange={e => setDuration(Number(e.target.value))} placeholder="Ej: 1800 = 30min" />
            </div>
            <div>
              <label className={labelCls}>Orden</label>
              <input type="number" min={1} className={inputCls} value={order} onChange={e => setOrder(Number(e.target.value))} />
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Visible para alumnos</label>
              <Toggle checked={published} onChange={setPublished} />
            </div>
          </div>

          {/* Resources — only when editing an existing lesson */}
          {lesson && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                <IoDocumentTextOutline size={16} /> Materiales de apoyo
              </h3>
              {resources.map(r => (
                <div key={r.id} className="flex items-center gap-2 mb-2 bg-slate-50 rounded-lg p-2">
                  <IoLinkOutline size={14} className="text-slate-400 shrink-0" />
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-[#00A9CE] truncate hover:underline">{r.title}</a>
                  <span className="text-xs text-slate-400 shrink-0">{r.type}</span>
                  <button onClick={() => deleteResource(r.id)} className="text-red-400 hover:text-red-600 shrink-0">
                    <IoTrashOutline size={14} />
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-5 gap-2 mt-3">
                <input className={`col-span-2 ${inputCls}`} value={newResTitle} onChange={e => setNewResTitle(e.target.value)} placeholder="Nombre del material" />
                <input className={`col-span-2 ${inputCls}`} value={newResUrl} onChange={e => setNewResUrl(e.target.value)} placeholder="URL" />
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
          )}
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
  const [linkedCycles, setLinkedCycles] = useState<Cycle[]>([]);
  const [allCycles, setAllCycles] = useState<Cycle[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  // Modals
  const [courseModal, setCourseModal] = useState<{ open: boolean; course: Course | null }>({ open: false, course: null });
  const [moduleModal, setModuleModal] = useState<{ open: boolean; mod: Module | null; courseId: string } | null>(null);
  const [lessonModal, setLessonModal] = useState<{ open: boolean; lesson: Lesson | null; moduleId: string } | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    setCourses(data || []);
    setLoadingCourses(false);
  }, []);

  const fetchCourseDetail = useCallback(async (course: Course) => {
    setLoadingDetail(true);
    const [{ data: mods }, { data: cycleData }, { data: allCycleData }] = await Promise.all([
      supabase.from('modules').select('*').eq('course_id', course.id).order('order_index'),
      supabase.from('cycles').select('id, name, course_id').eq('course_id', course.id),
      supabase.from('cycles').select('id, name, course_id').order('name'),
    ]);
    const modIds = (mods || []).map((m: Module) => m.id);
    const { data: lessonData } = modIds.length > 0
      ? await supabase.from('lessons').select('*').in('module_id', modIds).order('order_index')
      : { data: [] };
    setModules(mods || []);
    setLessons(lessonData || []);
    setLinkedCycles(cycleData || []);
    setAllCycles(allCycleData || []);
    setLoadingDetail(false);
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const openCourse = (course: Course) => {
    setSelectedCourse(course);
    setExpandedModule(null);
    fetchCourseDetail(course);
  };

  const backToList = () => { setSelectedCourse(null); setModules([]); setLessons([]); };

  const deleteCourse = async (id: string) => {
    if (!confirm('¿Eliminar este curso y todo su contenido?')) return;
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
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
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
      setModules(prev => prev.filter(m => m.id !== id));
      toast.success('Módulo eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar módulo: ' + err.message);
    }
  };

  const deleteLesson = async (id: string) => {
    if (!confirm('¿Eliminar esta clase?')) return;
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
      setLessons(prev => prev.filter(l => l.id !== id));
      toast.success('Clase eliminada');
    } catch (err: any) {
      toast.error('Error al eliminar clase: ' + err.message);
    }
  };

  const toggleLessonPublished = async (lesson: Lesson) => {
    try {
      const { error } = await supabase.from('lessons').update({ is_published: !lesson.is_published }).eq('id', lesson.id);
      if (error) throw error;
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, is_published: !l.is_published } : l));
      toast.success('Estado actualizado');
    } catch (err: any) {
      toast.error('Error al actualizar estado: ' + err.message);
    }
  };

  const linkCycle = async (cycleId: string) => {
    if (!selectedCourse) return;
    try {
      const { error } = await supabase.from('cycles').update({ course_id: selectedCourse.id }).eq('id', cycleId);
      if (error) throw error;
      fetchCourseDetail(selectedCourse);
    } catch (err: any) {
      toast.error('Error al vincular: ' + err.message);
    }
  };

  const unlinkCycle = async (cycleId: string) => {
    try {
      const { error } = await supabase.from('cycles').update({ course_id: null }).eq('id', cycleId);
      if (error) throw error;
      if (selectedCourse) fetchCourseDetail(selectedCourse);
    } catch (err: any) {
      toast.error('Error al desvincular: ' + err.message);
    }
  };

  const unlinkedCycles = allCycles.filter(c => c.course_id !== selectedCourse?.id && !linkedCycles.find(lc => lc.id === c.id));

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

        {loadingCourses ? (
          <div className="text-center py-16 text-slate-400">Cargando...</div>
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
                  style={course.cover_image_url ? { backgroundImage: `url(${course.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
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
            onSaved={() => { setCourseModal({ open: false, course: null }); fetchCourses(); }}
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
          <p className="text-sm text-slate-500">{modules.length} módulos · {lessons.length} clases</p>
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

          {loadingDetail ? (
            <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>
          ) : modules.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
              No hay módulos. Creá el primero para comenzar.
            </div>
          ) : (
            modules.map(mod => {
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

          {/* Course info summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-bold text-slate-700 mb-3">Estadísticas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Módulos</span><span className="font-bold text-slate-800">{modules.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Clases totales</span><span className="font-bold text-slate-800">{lessons.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Clases publicadas</span><span className="font-bold text-emerald-700">{lessons.filter(l => l.is_published).length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ciclos vinculados</span><span className="font-bold text-slate-800">{linkedCycles.length}</span></div>
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
            fetchCourses();
            if (selectedCourse && courseModal.course?.id === selectedCourse.id) {
              // Re-fetch updated course
              supabase.from('courses').select('*').eq('id', selectedCourse.id).single().then(({ data }) => {
                if (data) setSelectedCourse(data);
              });
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
          onSaved={() => { setModuleModal(null); if (selectedCourse) fetchCourseDetail(selectedCourse); }}
        />
      )}
      {lessonModal?.open && (
        <LessonModal
          lesson={lessonModal.lesson}
          moduleId={lessonModal.moduleId}
          nextOrder={lessons.filter(l => l.module_id === lessonModal.moduleId).length + 1}
          onClose={() => setLessonModal(null)}
          onSaved={() => { setLessonModal(null); if (selectedCourse) fetchCourseDetail(selectedCourse); }}
        />
      )}
    </>
  );
}
