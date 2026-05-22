'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  IoSparklesOutline, IoCloudUploadOutline, IoEyeOutline,
  IoArrowDownCircleOutline, IoArrowUpCircleOutline, IoHelpCircleOutline,
  IoMegaphoneOutline, IoCalendarOutline, IoVideocamOutline,
  IoDocumentTextOutline, IoCloseOutline, IoArrowForwardOutline,
  IoCheckmarkDoneOutline, IoTimeOutline,
} from 'react-icons/io5';
import { supabase } from '../../../services/supabaseClient';
import { restSelect, restInsert, restRpc } from '../../../services/supabaseRest';
import { getMyActorInfo } from '../../../services/activityEvents';
import type { ActivityEventType, ActivityTargetKind } from '../../../services/activityEvents';
import { composeHeadline, entityLink } from '../../../services/activityHeadlines';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface ReadRow { event_id: string }

type CategoryFilter = 'all' | 'content' | 'access' | 'submissions' | 'reviews' | 'forum';

// ─── Vocabulary maps ──────────────────────────────────────────────────────────

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
  'coach.work_approved':         'reviews',
};

const FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: 'all',         label: 'Todas' },
  { id: 'content',     label: 'Contenido' },
  { id: 'access',      label: 'Descargas' },
  { id: 'submissions', label: 'Entregas' },
  { id: 'reviews',     label: 'Devoluciones' },
  { id: 'forum',       label: 'Foro' },
];

interface CardVisuals {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;   // background/text for icon chip
  border: string;   // unread left-bar color
}

const VISUALS: Record<ActivityEventType, CardVisuals> = {
  'content.material_published':  { icon: IoDocumentTextOutline,    accent: 'bg-indigo-50 text-indigo-600',     border: 'border-l-indigo-400' },
  'content.lesson_published':    { icon: IoVideocamOutline,        accent: 'bg-indigo-50 text-indigo-600',     border: 'border-l-indigo-400' },
  'content.session_scheduled':   { icon: IoCalendarOutline,        accent: 'bg-indigo-50 text-indigo-600',     border: 'border-l-indigo-400' },
  'content.forum_announcement':  { icon: IoMegaphoneOutline,       accent: 'bg-violet-50 text-violet-600',     border: 'border-l-violet-400' },
  'student.material_accessed':   { icon: IoEyeOutline,             accent: 'bg-amber-50 text-amber-600',       border: 'border-l-amber-400' },
  'student.work_submitted':      { icon: IoArrowUpCircleOutline,   accent: 'bg-orange-50 text-orange-600',     border: 'border-l-orange-400' },
  'student.forum_question':      { icon: IoHelpCircleOutline,      accent: 'bg-rose-50 text-rose-600',         border: 'border-l-rose-400' },
  'coach.material_accessed':     { icon: IoEyeOutline,             accent: 'bg-teal-50 text-teal-600',         border: 'border-l-teal-400' },
  'coach.work_returned':         { icon: IoCheckmarkDoneOutline,   accent: 'bg-emerald-50 text-emerald-600',   border: 'border-l-emerald-400' },
  'coach.work_approved':         { icon: IoCheckmarkDoneOutline,   accent: 'bg-green-50 text-green-600',       border: 'border-l-green-500' },
};

// ─── Time grouping ────────────────────────────────────────────────────────────

function startOfDay(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
function dayDiff(a: Date, b: Date) {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

function groupLabel(eventDate: Date): 'Hoy' | 'Ayer' | 'Esta semana' | 'Antes' {
  const diff = dayDiff(new Date(), eventDate);
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff <= 7) return 'Esta semana';
  return 'Antes';
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'ahora';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

// ─── Headline composition ────────────────────────────────────────────────────


// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 60;

interface Props {
  /** Notifies the parent sidebar so it can update the unread badge. */
  onUnreadChange?: (count: number) => void;
}

export default function AdminActivity({ onUnreadChange }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const myProfileIdRef = useRef<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const actor = await getMyActorInfo();
      if (actor) myProfileIdRef.current = actor.profileId;

      const [eventsRes, readsRes] = await Promise.all([
        restSelect<ActivityEvent>('staff_activity_events', {
          columns: 'id,created_at,event_type,actor_profile_id,actor_role,subject_profile_id,target_kind,target_id,details',
          order: 'created_at.desc',
          limit: PAGE_SIZE,
        }),
        actor
          ? restSelect<ReadRow>('staff_activity_event_reads', {
              columns: 'event_id',
              filters: { profile_id: `eq.${actor.profileId}` },
              limit: 1000,
            })
          : Promise.resolve({ data: [], count: null }),
      ]);

      setEvents(eventsRes.data);
      setReadIds(new Set(readsRes.data.map(r => r.event_id)));
    } catch (err) {
      console.error('[AdminActivity] fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Realtime: new events appear instantly ───────────────────────────────
  useEffect(() => {
    const channelName = 'admin_activity_feed';
    supabase.getChannels().forEach(ch => {
      if (ch.topic.includes(channelName)) supabase.removeChannel(ch);
    });

    const channel = supabase.channel(channelName)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_activity_events' },
        (payload) => {
          const ev = payload.new as ActivityEvent;
          setEvents(prev => {
            if (prev.some(e => e.id === ev.id)) return prev;
            return [ev, ...prev].slice(0, PAGE_SIZE);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Notify parent of unread count ────────────────────────────────────────
  const unreadCount = useMemo(
    () => events.filter(e => !readIds.has(e.id)).length,
    [events, readIds]
  );
  useEffect(() => { onUnreadChange?.(unreadCount); }, [unreadCount, onUnreadChange]);

  // ── Filter + group ───────────────────────────────────────────────────────
  const filtered = useMemo(
    () => filter === 'all' ? events : events.filter(e => CATEGORY_OF[e.event_type] === filter),
    [events, filter]
  );

  const grouped = useMemo(() => {
    const groups: Record<string, ActivityEvent[]> = { 'Hoy': [], 'Ayer': [], 'Esta semana': [], 'Antes': [] };
    for (const ev of filtered) {
      const label = groupLabel(new Date(ev.created_at));
      groups[label].push(ev);
    }
    return groups;
  }, [filtered]);

  // ── Mark as read ─────────────────────────────────────────────────────────
  const markRead = async (eventId: string) => {
    if (readIds.has(eventId)) return;
    if (!myProfileIdRef.current) return;

    // Optimistic
    setReadIds(prev => new Set(prev).add(eventId));

    try {
      await restInsert(
        'staff_activity_event_reads',
        { event_id: eventId, profile_id: myProfileIdRef.current },
        { returning: 'minimal' }
      );
    } catch (err) {
      console.warn('[AdminActivity] markRead failed', err);
    }
  };

  const markAllRead = async () => {
    if (!myProfileIdRef.current) return;
    const unread = events.filter(e => !readIds.has(e.id));
    if (unread.length === 0) return;

    // Optimistic
    setReadIds(prev => {
      const next = new Set(prev);
      unread.forEach(e => next.add(e.id));
      return next;
    });

    try {
      await restInsert(
        'staff_activity_event_reads',
        unread.map(e => ({ event_id: e.id, profile_id: myProfileIdRef.current })),
        { returning: 'minimal' }
      );
    } catch (err) {
      console.warn('[AdminActivity] markAllRead failed', err);
    }
  };

  const handleCardTap = (ev: ActivityEvent) => {
    setSelectedEvent(ev);
    markRead(ev.id);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Bandeja de actividad</h2>
          <p className="text-sm text-slate-500 mt-1">
            Todo lo que pasa en el campus, en vivo. {unreadCount > 0 && (
              <span className="font-bold text-slate-900">{unreadCount} nuevo{unreadCount !== 1 ? 's' : ''} por leer.</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-bold uppercase tracking-wider text-[#00A9CE] hover:underline whitespace-nowrap"
            >
              Marcar todo como leído
            </button>
          )}
          <a
            href="/admin/actividad"
            className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            Ver historial completo →
          </a>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map(f => {
          const isActive = filter === f.id;
          const count = f.id === 'all'
            ? events.length
            : events.filter(e => CATEGORY_OF[e.event_type] === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.label}
              <span className={`min-w-[18px] text-center text-[10px] font-bold rounded-full px-1.5 ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-100 border-t-[#00A9CE] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <IoSparklesOutline size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">Sin actividad en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(['Hoy', 'Ayer', 'Esta semana', 'Antes'] as const).map(label => {
            const items = grouped[label];
            if (items.length === 0) return null;
            return (
              <section key={label}>
                <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-3 pl-1">
                  {label}
                </h3>
                <div className="space-y-2">
                  {items.map(ev => {
                    const isUnread = !readIds.has(ev.id);
                    const visuals = VISUALS[ev.event_type];
                    const { title, secondary } = composeHeadline(ev);
                    const Icon = visuals.icon;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => handleCardTap(ev)}
                        className={`w-full text-left bg-white rounded-xl border border-slate-200 hover:border-[#00A9CE]/40 hover:shadow-sm transition-all flex items-start gap-4 p-4 min-h-[80px] ${
                          isUnread ? `border-l-4 ${visuals.border}` : ''
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-xl ${visuals.accent} flex items-center justify-center shrink-0`}>
                          <Icon size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-tight ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {title}
                          </p>
                          {secondary && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{secondary}</p>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1.5">
                          {isUnread && <span className="w-2 h-2 rounded-full bg-[#00A9CE] animate-pulse" />}
                          {timeAgo(ev.created_at)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function EventDetailModal({ event, onClose }: { event: ActivityEvent; onClose: () => void }) {
  const visuals = VISUALS[event.event_type];
  const { title, secondary } = composeHeadline(event);
  const link = entityLink(event);
  const Icon = visuals.icon;
  const d = event.details || {};
  const fullDate = new Date(event.created_at).toLocaleString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl ${visuals.accent} flex items-center justify-center shrink-0`}>
              <Icon size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 leading-tight">{title}</h3>
              {secondary && <p className="text-sm text-slate-600 mt-1 leading-snug">{secondary}</p>}
              <p className="text-[10px] text-slate-400 font-medium mt-2 flex items-center gap-1.5">
                <IoTimeOutline size={12} /> {fullDate}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 shrink-0 -mr-2 -mt-1"
              aria-label="Cerrar"
            >
              <IoCloseOutline size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Forum body preview */}
          {(event.event_type === 'student.forum_question' || event.event_type === 'content.forum_announcement') && d.bodyPreview && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Mensaje</p>
              <p className="text-sm text-slate-700 italic leading-relaxed">{d.bodyPreview}</p>
            </div>
          )}

          {/* Context grid */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Contexto</p>
            {d.courseTitle && <DetailRow label="Programa" value={d.courseTitle} />}
            {d.cycleName && <DetailRow label="Ciclo" value={d.cycleName} />}
            {d.moduleTitle && <DetailRow label="Módulo" value={d.moduleTitle} />}
            {d.lessonTitle && <DetailRow label="Clase" value={d.lessonTitle} />}
            {d.materialTitle && <DetailRow label="Material" value={d.materialTitle} />}
            {d.materialType && <DetailRow label="Tipo" value={d.materialType} />}
            {d.fileName && <DetailRow label="Archivo" value={d.fileName} />}
            {d.submissionFileName && <DetailRow label="Entrega" value={d.submissionFileName} />}
            {d.revisedFileName && <DetailRow label="Devolución" value={d.revisedFileName} />}
            {d.version && <DetailRow label="Versión" value={`v${d.version}`} />}
            {d.submissionVersion && <DetailRow label="Versión entrega" value={`v${d.submissionVersion}`} />}
            {d.isLate && <DetailRow label="Estado" value="Entrega tardía" valueClass="text-amber-700 font-bold" />}
            {d.sessionDate && <DetailRow label="Fecha" value={`${d.sessionDate}${d.sessionTime ? ` · ${String(d.sessionTime).slice(0,5)}` : ''}`} />}
            {d.hasFeedback && <DetailRow label="Feedback" value="Sí" valueClass="text-emerald-700" />}
          </div>

          {/* Actor */}
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/40">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cerrar
          </button>
          {link && (
            <a
              href={link.href}
              className="px-5 py-2.5 bg-[#00A9CE] hover:bg-[#0099BB] text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
            >
              {link.label}
              <IoArrowForwardOutline size={16} />
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
