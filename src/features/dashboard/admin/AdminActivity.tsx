'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  IoSparklesOutline, IoEyeOutline,
  IoArrowUpCircleOutline, IoHelpCircleOutline,
  IoMegaphoneOutline, IoCalendarOutline, IoVideocamOutline,
  IoDocumentTextOutline, IoCloseOutline, IoArrowForwardOutline,
  IoCheckmarkDoneOutline, IoTimeOutline, IoSearchOutline,
  IoListOutline, IoGridOutline, IoTrashOutline,
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
type ViewMode = 'list' | 'grid';

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
  'admin.submission_deleted':    'submissions',
};

const EVENT_LABEL: Record<ActivityEventType, string> = {
  'content.material_published':  'material publicado',
  'content.lesson_published':    'clase publicada',
  'content.session_scheduled':   'sesión programada',
  'content.forum_announcement':  'anuncio del foro',
  'student.material_accessed':   'descarga',
  'student.work_submitted':      'entrega',
  'student.forum_question':      'pregunta en foro',
  'coach.material_accessed':     'acceso de coach',
  'coach.work_returned':         'devolución',
  'coach.work_approved':         'aprobación',
  'admin.submission_deleted':    'entrega eliminada',
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
  accent: string;
  border: string;
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
  'admin.submission_deleted':    { icon: IoTrashOutline,           accent: 'bg-red-50 text-red-600',           border: 'border-l-red-400' },
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

function matchesSearch(ev: ActivityEvent, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const d = ev.details || {};
  const haystack = [
    d.actorName, d.subjectName,
    d.courseTitle, d.cycleName, d.moduleTitle, d.lessonTitle, d.materialTitle,
    d.fileName, d.submissionFileName, d.revisedFileName,
    EVENT_LABEL[ev.event_type],
    ev.actor_role,
  ]
    .filter(Boolean)
    .map((s: any) => String(s).toLowerCase())
    .join(' | ');
  return haystack.includes(q);
}

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 60;
const VIEW_MODE_KEY = 'admin_activity_view_mode';

interface Props {
  /** Legacy notifier — the AdminShell badge now polls via RPC, but this prop is kept for back-compat. */
  onUnreadChange?: (count: number) => void;
}

export default function AdminActivity({ onUnreadChange }: Props) {
  const router = useRouter();
  const pathname = usePathname() || '/admin/actividad';
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') ?? '';

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [trueUnreadCount, setTrueUnreadCount] = useState(0);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const [searchInput, setSearchInput] = useState(queryParam);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const myProfileIdRef = useRef<string | null>(null);

  // Load persisted view mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'list' || stored === 'grid') setViewMode(stored);
  }, []);

  const changeViewMode = (m: ViewMode) => {
    setViewMode(m);
    try { window.localStorage.setItem(VIEW_MODE_KEY, m); } catch {}
  };

  // Sync URL ?q= with searchInput (debounced)
  useEffect(() => { setSearchInput(queryParam); }, [queryParam]);
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput === queryParam) return;
      const sp = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
      if (searchInput) sp.set('q', searchInput); else sp.delete('q');
      const qs = sp.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`);
    }, 250);
    return () => clearTimeout(handle);
  }, [searchInput, queryParam, pathname, router, searchParams]);

  const refreshTrueUnread = useCallback(async () => {
    try {
      const count = await restRpc<number>('staff_activity_unread_count');
      setTrueUnreadCount(count ?? 0);
    } catch {}
  }, []);

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

  // Fetch true unread count on mount
  useEffect(() => { refreshTrueUnread(); }, [refreshTrueUnread]);

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

  // ── Unread count: local (from loaded events) and true total (from RPC) ────
  const unreadCount = useMemo(
    () => events.filter(e => !readIds.has(e.id)).length,
    [events, readIds]
  );
  // Report true total (from RPC) to the shell badge, falling back to local count
  useEffect(() => { onUnreadChange?.(trueUnreadCount); }, [trueUnreadCount, onUnreadChange]);

  // ── Unread by category for chip counters ─────────────────────────────────
  const unreadByCategory = useMemo(() => {
    const out: Record<CategoryFilter, number> = { all: 0, content: 0, access: 0, submissions: 0, reviews: 0, forum: 0 };
    for (const ev of events) {
      if (readIds.has(ev.id)) continue;
      out.all += 1;
      const cat = CATEGORY_OF[ev.event_type];
      if (cat) out[cat] += 1;
    }
    return out;
  }, [events, readIds]);

  // ── Filter + search + group ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = queryParam.trim();
    return events.filter(ev => {
      if (filter !== 'all' && CATEGORY_OF[ev.event_type] !== filter) return false;
      if (q && !matchesSearch(ev, q)) return false;
      return true;
    });
  }, [events, filter, queryParam]);

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
    try {
      // Fetch ALL event IDs (not just the loaded PAGE_SIZE)
      const { data: allIds } = await restSelect<{ id: string }>('staff_activity_events', {
        columns: 'id',
      });
      if (!allIds || allIds.length === 0) return;

      // Filter to only those not already marked as read
      const unreadIds = allIds.map(r => r.id).filter(id => !readIds.has(id));
      if (unreadIds.length === 0) return;

      // Optimistically update local state
      setReadIds(prev => {
        const next = new Set(prev);
        unreadIds.forEach(id => next.add(id));
        return next;
      });
      setTrueUnreadCount(0);

      // Insert reads for all unread events
      await restInsert(
        'staff_activity_event_reads',
        unreadIds.map(id => ({ event_id: id, profile_id: myProfileIdRef.current })),
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

  const isFiltering = !!queryParam.trim() || filter !== 'all';

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Bandeja de actividad</h2>
          <p className="text-sm text-slate-500 mt-1">
            Todo lo que pasa en el campus, en vivo. {trueUnreadCount > 0 && (
              <span className="font-bold text-slate-900">{trueUnreadCount} nuevo{trueUnreadCount !== 1 ? 's' : ''} por leer.</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {trueUnreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-bold uppercase tracking-wider text-[#00A9CE] hover:underline whitespace-nowrap"
            >
              Marcar todo como leído
            </button>
          )}
          <a
            href="/admin/actividad/historial"
            className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            Ver historial completo →
          </a>
        </div>
      </div>

      {/* Search + view toggle */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por persona, contenido, tipo de evento..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30 focus:border-[#00A9CE]/40"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <IoCloseOutline size={18} />
            </button>
          )}
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0">
          <button
            onClick={() => changeViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
            aria-label="Vista lista"
          >
            <IoListOutline size={16} />
            Lista
          </button>
          <button
            onClick={() => changeViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
            aria-label="Vista mosaicos"
          >
            <IoGridOutline size={16} />
            Mosaicos
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map(f => {
          const isActive = filter === f.id;
          const count = unreadByCategory[f.id];
          const muted = count === 0;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : muted
                    ? 'bg-slate-50 text-slate-400 border border-slate-100'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.label}
              <span
                className={`min-w-[18px] text-center text-[10px] font-bold rounded-full px-1.5 ${
                  isActive
                    ? 'bg-white/20'
                    : muted
                      ? 'bg-transparent text-slate-300'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
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
          <p className="text-slate-500 text-sm">
            {isFiltering ? 'Sin resultados para esa búsqueda o filtro.' : 'Sin actividad en esta categoría.'}
          </p>
          {isFiltering && (
            <button
              onClick={() => { setSearchInput(''); setFilter('all'); }}
              className="mt-3 text-xs font-bold uppercase tracking-wider text-[#00A9CE] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
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
                {viewMode === 'list' ? (
                  <div className="space-y-2">
                    {items.map(ev => (
                      <ActivityCardList
                        key={ev.id}
                        ev={ev}
                        unread={!readIds.has(ev.id)}
                        onTap={handleCardTap}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {items.map(ev => (
                      <ActivityCardGrid
                        key={ev.id}
                        ev={ev}
                        unread={!readIds.has(ev.id)}
                        onTap={handleCardTap}
                      />
                    ))}
                  </div>
                )}
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

// ─── Cards ────────────────────────────────────────────────────────────────────

function ActivityCardList({
  ev, unread, onTap,
}: { ev: ActivityEvent; unread: boolean; onTap: (ev: ActivityEvent) => void }) {
  const visuals = VISUALS[ev.event_type];
  const { title, secondary } = composeHeadline(ev);
  const Icon = visuals.icon;
  return (
    <button
      onClick={() => onTap(ev)}
      className={`w-full text-left bg-white rounded-xl border border-slate-200 hover:border-[#00A9CE]/40 hover:shadow-sm transition-all flex items-start gap-4 p-4 min-h-[80px] ${
        unread ? `border-l-4 ${visuals.border}` : 'opacity-90'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl ${visuals.accent} flex items-center justify-center shrink-0 transition-opacity ${unread ? '' : 'opacity-70'}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight transition-colors ${unread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
          {title}
        </p>
        {secondary && (
          <p className={`text-xs mt-1 line-clamp-2 ${unread ? 'text-slate-500' : 'text-slate-400'}`}>{secondary}</p>
        )}
      </div>
      <div className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1.5">
        {unread && <span className="w-2 h-2 rounded-full bg-[#00A9CE] animate-pulse" />}
        {timeAgo(ev.created_at)}
      </div>
    </button>
  );
}

function ActivityCardGrid({
  ev, unread, onTap,
}: { ev: ActivityEvent; unread: boolean; onTap: (ev: ActivityEvent) => void }) {
  const visuals = VISUALS[ev.event_type];
  const { title, secondary } = composeHeadline(ev);
  const Icon = visuals.icon;
  const actorName = ev.details?.actorName;
  return (
    <button
      onClick={() => onTap(ev)}
      className={`text-left bg-white rounded-2xl border border-slate-200 hover:border-[#00A9CE]/40 hover:shadow-md transition-all p-4 flex flex-col gap-3 min-h-[160px] ${
        unread ? `border-t-4 ${visuals.border.replace('border-l-', 'border-t-')}` : 'opacity-90'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl ${visuals.accent} flex items-center justify-center shrink-0 transition-opacity ${unread ? '' : 'opacity-70'}`}>
          <Icon size={20} />
        </div>
        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
          {unread && <span className="w-2 h-2 rounded-full bg-[#00A9CE] animate-pulse" />}
          {timeAgo(ev.created_at)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug line-clamp-2 ${unread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
          {title}
        </p>
        {secondary && (
          <p className={`text-xs mt-1.5 line-clamp-2 ${unread ? 'text-slate-500' : 'text-slate-400'}`}>{secondary}</p>
        )}
      </div>
      {actorName && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {String(actorName).split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[11px] font-medium text-slate-500 truncate">{actorName}</span>
        </div>
      )}
    </button>
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
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cerrar</button>
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
