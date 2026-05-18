'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  IoSparklesOutline, IoCloudUploadOutline, IoEyeOutline,
  IoArrowUpCircleOutline, IoHelpCircleOutline,
  IoMegaphoneOutline, IoCalendarOutline, IoVideocamOutline,
  IoDocumentTextOutline, IoCloseOutline, IoArrowForwardOutline,
  IoCheckmarkDoneOutline, IoTimeOutline, IoSearchOutline,
  IoArrowBackOutline, IoFilterOutline,
} from 'react-icons/io5';
import { restSelect } from '@/src/services/supabaseRest';
import type { ActivityEventType, ActivityTargetKind } from '@/src/services/activityEvents';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ActivityEvent {
  id: string;
  created_at: string;
  event_type: ActivityEventType;
  actor_profile_id: string | null;
  actor_role: string | null;
  subject_profile_id: string | null;
  target_kind: ActivityTargetKind | null;
  target_id: string | null;
  details: Record<string, any>;
}

export interface CourseTab { id: string; title: string }

type DatePreset = 'today' | 'week' | 'month' | 'all';
type CategoryFilter = 'all' | 'content' | 'access' | 'submissions' | 'reviews' | 'forum';

// ─── Vocabulary ────────────────────────────────────────────────────────────────

const CATEGORY_OF: Record<ActivityEventType, CategoryFilter> = {
  'content.material_published':  'content',
  'content.lesson_published':    'content',
  'content.session_scheduled':   'content',
  'content.forum_announcement':  'forum',
  'student.material_accessed':   'access',
  'student.work_submitted':      'submissions',
  'student.forum_question':      'forum',
  'coach.material_accessed':     'access',
  'coach.work_returned':         'reviews',
};

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'all',         label: 'Todas' },
  { id: 'content',     label: 'Contenido' },
  { id: 'access',      label: 'Descargas' },
  { id: 'submissions', label: 'Entregas' },
  { id: 'reviews',     label: 'Devoluciones' },
  { id: 'forum',       label: 'Foro' },
];

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week',  label: 'Últimos 7 días' },
  { id: 'month', label: 'Últimos 30 días' },
  { id: 'all',   label: 'Todo el historial' },
];

interface CardVisuals {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
  border: string;
}

const VISUALS: Record<ActivityEventType, CardVisuals> = {
  'content.material_published':  { icon: IoDocumentTextOutline,  accent: 'bg-indigo-50 text-indigo-600',   border: 'border-l-indigo-400' },
  'content.lesson_published':    { icon: IoVideocamOutline,      accent: 'bg-indigo-50 text-indigo-600',   border: 'border-l-indigo-400' },
  'content.session_scheduled':   { icon: IoCalendarOutline,      accent: 'bg-indigo-50 text-indigo-600',   border: 'border-l-indigo-400' },
  'content.forum_announcement':  { icon: IoMegaphoneOutline,     accent: 'bg-violet-50 text-violet-600',   border: 'border-l-violet-400' },
  'student.material_accessed':   { icon: IoEyeOutline,           accent: 'bg-amber-50 text-amber-600',     border: 'border-l-amber-400' },
  'student.work_submitted':      { icon: IoArrowUpCircleOutline, accent: 'bg-orange-50 text-orange-600',   border: 'border-l-orange-400' },
  'student.forum_question':      { icon: IoHelpCircleOutline,    accent: 'bg-rose-50 text-rose-600',       border: 'border-l-rose-400' },
  'coach.material_accessed':     { icon: IoEyeOutline,           accent: 'bg-teal-50 text-teal-600',       border: 'border-l-teal-400' },
  'coach.work_returned':         { icon: IoCheckmarkDoneOutline, accent: 'bg-emerald-50 text-emerald-600', border: 'border-l-emerald-400' },
};

// ─── Time helpers ───────────────────────────────────────────────────────────────

function startOfDay(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
function dayDiff(a: Date, b: Date) {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}
function groupLabel(d: Date): string {
  const diff = dayDiff(new Date(), d);
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff <= 7) return 'Esta semana';
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}
function fmtFull(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtShort(iso: string) {
  const d = new Date(iso);
  const diff = dayDiff(new Date(), d);
  if (diff <= 0) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (diff <= 7) return d.toLocaleDateString('es-AR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

// ─── Headline / link ────────────────────────────────────────────────────────────

function composeHeadline(ev: ActivityEvent): { title: string; secondary: string | null } {
  const d = ev.details || {};
  const actor = d.actorName || 'Alguien';
  switch (ev.event_type) {
    case 'content.material_published':
      return { title: `${actor} subió un material`, secondary: d.materialTitle ? `«${d.materialTitle}»${d.lessonTitle ? ` · ${d.lessonTitle}` : ''}` : null };
    case 'content.lesson_published':
      return { title: `${actor} publicó una clase`, secondary: d.lessonTitle ? `«${d.lessonTitle}»${d.hasVideo ? ' · con video' : ''}` : null };
    case 'content.session_scheduled':
      return { title: `${actor} agendó un encuentro`, secondary: `${d.sessionDate ?? ''}${d.sessionTime ? ` · ${String(d.sessionTime).slice(0,5)}` : ''}${d.cycleName ? ` · ${d.cycleName}` : d.courseTitle ? ` · ${d.courseTitle}` : ''}`.trim() || null };
    case 'content.forum_announcement':
      return { title: `${actor} abrió un hilo en el foro`, secondary: d.title ? `«${d.title}»` : d.bodyPreview ?? null };
    case 'student.material_accessed':
      return { title: `${actor} abrió un material`, secondary: d.materialTitle ? `«${d.materialTitle}»${d.lessonTitle ? ` · ${d.lessonTitle}` : ''}` : null };
    case 'student.work_submitted':
      return { title: `${actor} entregó una guía trabajada`, secondary: `${d.fileName ?? 'archivo'}${d.version ? ` · v${d.version}` : ''}${d.isLate ? ' · entrega tardía' : ''}${d.lessonTitle ? ` · ${d.lessonTitle}` : ''}` };
    case 'student.forum_question':
      return { title: `${actor} preguntó en el foro`, secondary: d.title ? `«${d.title}»` : d.bodyPreview ?? null };
    case 'coach.material_accessed':
      return { title: `${actor} (coach) descargó un material`, secondary: d.materialTitle ? `«${d.materialTitle}»${d.lessonTitle ? ` · ${d.lessonTitle}` : ''}` : null };
    case 'coach.work_returned':
      return { title: `${actor} devolvió una entrega`, secondary: `${d.lessonTitle ?? 'clase'}${d.submissionVersion ? ` · v${d.submissionVersion}` : ''}${d.hasFeedback ? ' · con feedback' : ''}` };
    default:
      return { title: 'Evento', secondary: null };
  }
}

function entityLink(ev: ActivityEvent): { href: string; label: string } | null {
  const d = ev.details || {};
  switch (ev.target_kind) {
    case 'lesson_resource':
    case 'lesson':
      if (d.courseId) return { href: `/admin/lms/${d.courseId}`, label: 'Ir al curso' };
      return null;
    case 'submission':
    case 'submission_review':
      if (d.courseId) return { href: `/admin/lms/${d.courseId}/entregas`, label: 'Ir a entregas' };
      return null;
    case 'course_session':
    case 'cycle_session':
      return { href: '/calendario', label: 'Ver calendario' };
    case 'forum_post':
      return { href: '/comunidad', label: 'Ir al foro' };
    default:
      return null;
  }
}

// ─── DB fetch ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 150;

function buildDateFilter(preset: DatePreset): string | null {
  if (preset === 'all') return null;
  const now = new Date();
  if (preset === 'today') { now.setHours(0, 0, 0, 0); }
  else if (preset === 'week') { now.setDate(now.getDate() - 7); now.setHours(0, 0, 0, 0); }
  else if (preset === 'month') { now.setMonth(now.getMonth() - 1); now.setHours(0, 0, 0, 0); }
  return `gte.${now.toISOString()}`;
}

// ─── Component ──────────────────────────────────────────────────────────────────

interface Props {
  courses: CourseTab[];
}

export default function ActivityTimelineClient({ courses }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>('week');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchEvents = useCallback(async (preset: DatePreset, lim: number) => {
    setLoading(true);
    try {
      const dateFilter = buildDateFilter(preset);
      const filters: Record<string, string | string[]> = {};
      if (dateFilter) filters['created_at'] = dateFilter;

      const { data } = await restSelect<ActivityEvent>('staff_activity_events', {
        columns: 'id,created_at,event_type,actor_profile_id,actor_role,subject_profile_id,target_kind,target_id,details',
        filters,
        order: 'created_at.desc',
        limit: lim + 1,
      });
      setHasMore(data.length > lim);
      setEvents(data.slice(0, lim));
    } catch (err) {
      console.error('[ActivityTimeline] fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(datePreset, limit); }, [fetchEvents, datePreset, limit]);

  // ── Client-side filtering ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = events;
    if (category !== 'all') result = result.filter(e => CATEGORY_OF[e.event_type] === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(e => {
        const name = (e.details?.actorName ?? '').toLowerCase();
        const title = (e.details?.lessonTitle ?? '').toLowerCase();
        const material = (e.details?.materialTitle ?? '').toLowerCase();
        return name.includes(q) || title.includes(q) || material.includes(q);
      });
    }
    if (courseFilter !== 'all') {
      result = result.filter(e => e.details?.courseId === courseFilter);
    }
    return result;
  }, [events, category, search, courseFilter]);

  // ── Time grouping ─────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, ActivityEvent[]> = {};
    for (const ev of filtered) {
      const label = groupLabel(new Date(ev.created_at));
      if (!map[label]) { map[label] = []; order.push(label); }
      map[label].push(ev);
    }
    return { order, map };
  }, [filtered]);

  // ── Summary counts ────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const counts: Record<CategoryFilter, number> = { all: 0, content: 0, access: 0, submissions: 0, reviews: 0, forum: 0 };
    for (const ev of events) {
      counts.all++;
      const cat = CATEGORY_OF[ev.event_type];
      if (cat) counts[cat]++;
    }
    return counts;
  }, [events]);

  const handleLoadMore = () => setLimit(l => l + PAGE_SIZE);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setLimit(PAGE_SIZE);
  };

  // ─── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-center gap-4 flex-wrap">
          <a
            href="/admin/dashboard"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <IoArrowBackOutline size={16} /> Admin
          </a>
          <span className="text-slate-300">/</span>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IoFilterOutline size={22} className="text-slate-400" />
            Historial de actividad
          </h1>
        </div>

        {/* ── Summary strip ── */}
        {!loading && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => {
              const count = summary[cat.id];
              const isActive = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className={`text-xl font-black leading-none ${isActive ? 'text-white' : 'text-slate-900'}`}>{count}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Filter bar ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          {/* Row 1: date presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Período</span>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    datePreset === p.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: search + course */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-0">
              <IoSearchOutline size={16} className="text-slate-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por persona, clase o material..."
                className="bg-transparent outline-none flex-1 ml-2 text-sm text-slate-700 placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 shrink-0">
                  <IoCloseOutline size={16} />
                </button>
              )}
            </div>
            <select
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 outline-none focus:border-[#00A9CE] min-w-[160px]"
            >
              <option value="all">Todos los programas</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Feed ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A9CE] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
            <IoSparklesOutline size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              {search || courseFilter !== 'all' || category !== 'all'
                ? 'Ningún evento coincide con los filtros aplicados.'
                : 'Sin actividad en el período seleccionado.'}
            </p>
            {(search || courseFilter !== 'all' || category !== 'all') && (
              <button
                onClick={() => { setSearch(''); setCourseFilter('all'); setCategory('all'); }}
                className="mt-4 text-sm font-bold text-[#00A9CE] hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.order.map(label => {
              const items = grouped.map[label];
              return (
                <section key={label}>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-3 pl-1">
                    {label} <span className="normal-case font-bold text-slate-300">({items.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {items.map(ev => {
                      const visuals = VISUALS[ev.event_type];
                      const { title, secondary } = composeHeadline(ev);
                      const Icon = visuals.icon;
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`w-full text-left bg-white rounded-xl border border-l-4 border-slate-200 hover:border-[#00A9CE]/40 hover:shadow-sm transition-all flex items-start gap-4 p-4 ${visuals.border}`}
                        >
                          <div className={`w-10 h-10 rounded-xl ${visuals.accent} flex items-center justify-center shrink-0`}>
                            <Icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 leading-tight">{title}</p>
                            {secondary && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{secondary}</p>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium shrink-0 mt-0.5 whitespace-nowrap">
                            {fmtShort(ev.created_at)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  className="px-8 py-3 bg-white border border-slate-200 hover:border-slate-300 text-sm font-bold text-slate-700 rounded-xl transition-all hover:shadow-sm"
                >
                  Cargar más eventos
                </button>
              </div>
            )}

            <p className="text-center text-xs text-slate-400 pb-8">
              Mostrando {filtered.length} evento{filtered.length !== 1 ? 's' : ''}
              {(search || courseFilter !== 'all' || category !== 'all') && ' (filtrado)'}
            </p>
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

// ─── Event detail modal ──────────────────────────────────────────────────────────

function EventDetailModal({ event, onClose }: { event: ActivityEvent; onClose: () => void }) {
  const visuals = VISUALS[event.event_type];
  const { title, secondary } = composeHeadline(event);
  const link = entityLink(event);
  const Icon = visuals.icon;
  const d = event.details || {};

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl ${visuals.accent} flex items-center justify-center shrink-0`}>
              <Icon size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 leading-tight">{title}</h3>
              {secondary && <p className="text-sm text-slate-600 mt-1 leading-snug">{secondary}</p>}
              <p className="text-[10px] text-slate-400 font-medium mt-2 flex items-center gap-1.5">
                <IoTimeOutline size={12} /> {fmtFull(event.created_at)}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0 -mr-2 -mt-1" aria-label="Cerrar">
              <IoCloseOutline size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(event.event_type === 'student.forum_question' || event.event_type === 'content.forum_announcement') && d.bodyPreview && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Mensaje</p>
              <p className="text-sm text-slate-700 italic leading-relaxed">{d.bodyPreview}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Contexto</p>
            {d.courseTitle    && <DetailRow label="Programa"  value={d.courseTitle} />}
            {d.cycleName      && <DetailRow label="Ciclo"     value={d.cycleName} />}
            {d.moduleTitle    && <DetailRow label="Módulo"    value={d.moduleTitle} />}
            {d.lessonTitle    && <DetailRow label="Clase"     value={d.lessonTitle} />}
            {d.materialTitle  && <DetailRow label="Material"  value={d.materialTitle} />}
            {d.materialType   && <DetailRow label="Tipo"      value={d.materialType} />}
            {d.fileName       && <DetailRow label="Archivo"   value={d.fileName} />}
            {d.version        && <DetailRow label="Versión"   value={`v${d.version}`} />}
            {d.submissionVersion && <DetailRow label="V. entrega" value={`v${d.submissionVersion}`} />}
            {d.isLate         && <DetailRow label="Estado"    value="Entrega tardía" valueClass="text-amber-700 font-bold" />}
            {d.sessionDate    && <DetailRow label="Fecha"     value={`${d.sessionDate}${d.sessionTime ? ` · ${String(d.sessionTime).slice(0,5)}` : ''}`} />}
            {d.hasFeedback    && <DetailRow label="Feedback"  value="Sí" valueClass="text-emerald-700" />}
          </div>

          {d.actorName && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Quién</p>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {(d.actorName as string).split(' ').map((s: string) => s[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{d.actorName}</p>
                  {event.actor_role && (
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{event.actor_role}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/40">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
            Cerrar
          </button>
          {link && (
            <a
              href={link.href}
              className="px-5 py-2.5 bg-[#00A9CE] hover:bg-[#0099BB] text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
            >
              {link.label} <IoArrowForwardOutline size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 w-24">{label}</span>
      <span className={`text-sm text-slate-700 flex-1 ${valueClass}`}>{value}</span>
    </div>
  );
}
