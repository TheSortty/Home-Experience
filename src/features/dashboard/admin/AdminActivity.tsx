'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  IoSparklesOutline, IoEyeOutline,
  IoArrowUpCircleOutline, IoHelpCircleOutline,
  IoMegaphoneOutline, IoCalendarOutline, IoVideocamOutline,
  IoDocumentTextOutline, IoCloseOutline, IoArrowForwardOutline,
  IoCheckmarkDoneOutline, IoTimeOutline, IoSearchOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import { supabase } from '../../../services/supabaseClient';
import { restSelect, restUpsert, restRpc } from '../../../services/supabaseRest';
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
  'admin.submission_deleted':    'submissions',
};

/** Un bloque por categoría, cada uno con su propio mini-feed — en vez de un
 *  feed único filtrable por chips. */
const CATEGORY_BLOCKS: { id: Exclude<CategoryFilter, 'all'>; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; accent: string }[] = [
  { id: 'submissions', label: 'Entregas',      icon: IoArrowUpCircleOutline, accent: 'bg-orange-50 text-orange-600' },
  { id: 'reviews',     label: 'Devoluciones',  icon: IoCheckmarkDoneOutline, accent: 'bg-emerald-50 text-emerald-600' },
  { id: 'content',     label: 'Contenido',     icon: IoDocumentTextOutline,  accent: 'bg-indigo-50 text-indigo-600' },
  { id: 'access',      label: 'Descargas',     icon: IoEyeOutline,           accent: 'bg-amber-50 text-amber-600' },
  { id: 'forum',       label: 'Foro',          icon: IoMegaphoneOutline,     accent: 'bg-violet-50 text-violet-600' },
];
const BLOCK_PREVIEW_SIZE = 3;

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

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'ahora';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

interface PersonSuggestion { id: string; name: string; email: string }
interface ProfileRow { id: string; first_name: string | null; last_name: string | null; email: string | null }

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 60;

interface Props {
  /** Legacy notifier — the AdminShell badge now polls via RPC, but this prop is kept for back-compat. */
  onUnreadChange?: (count: number) => void;
}

export default function AdminActivity({ onUnreadChange }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [trueUnreadCount, setTrueUnreadCount] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const myProfileIdRef = useRef<string | null>(null);

  // ── Buscar por persona: autocompletar y elegir (queda como un tag), en vez
  //    de filtrar letra a letra sobre lo poco que hay cargado en memoria.
  //    Al elegir una persona SÍ se pide al servidor toda su actividad. ──
  const [personQuery, setPersonQuery] = useState('');
  const [personSuggestions, setPersonSuggestions] = useState<PersonSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonSuggestion | null>(null);
  const [personEvents, setPersonEvents] = useState<ActivityEvent[] | null>(null);
  const [loadingPersonEvents, setLoadingPersonEvents] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPerson) return;
    const q = personQuery.trim();
    if (q.length < 2) { setPersonSuggestions([]); setSuggestOpen(false); return; }
    const handle = setTimeout(async () => {
      try {
        const pattern = `ilike.*${q}*`;
        const [byFirst, byLast, byEmail] = await Promise.all([
          restSelect<ProfileRow>('profiles', { columns: 'id,first_name,last_name,email', filters: { first_name: pattern }, limit: 6 }),
          restSelect<ProfileRow>('profiles', { columns: 'id,first_name,last_name,email', filters: { last_name: pattern }, limit: 6 }),
          restSelect<ProfileRow>('profiles', { columns: 'id,first_name,last_name,email', filters: { email: pattern }, limit: 6 }),
        ]);
        const byId = new Map<string, ProfileRow>();
        [...byFirst.data, ...byLast.data, ...byEmail.data].forEach(p => byId.set(p.id, p));
        setPersonSuggestions(
          Array.from(byId.values()).slice(0, 8).map(p => ({
            id: p.id,
            name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || 'Sin nombre',
            email: p.email ?? '',
          }))
        );
        setSuggestOpen(true);
      } catch (err) {
        console.error('[AdminActivity] person suggest failed', err);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [personQuery, selectedPerson]);

  // Close the suggestion dropdown on outside click.
  useEffect(() => {
    if (!suggestOpen) return;
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [suggestOpen]);

  const selectPerson = async (p: PersonSuggestion) => {
    setSelectedPerson(p);
    setPersonQuery('');
    setPersonSuggestions([]);
    setSuggestOpen(false);
    setLoadingPersonEvents(true);
    try {
      const { data } = await restSelect<ActivityEvent>('staff_activity_events', {
        columns: 'id,created_at,event_type,actor_profile_id,actor_role,subject_profile_id,target_kind,target_id,details',
        filters: { or: `(actor_profile_id.eq.${p.id},subject_profile_id.eq.${p.id})` },
        order: 'created_at.desc',
        limit: 500,
      });
      setPersonEvents(data);
    } catch (err) {
      console.error('[AdminActivity] fetch person activity failed', err);
      toast.error('No se pudo traer la actividad de esa persona');
      setPersonEvents([]);
    } finally {
      setLoadingPersonEvents(false);
    }
  };

  const clearPerson = () => {
    setSelectedPerson(null);
    setPersonEvents(null);
    setPersonQuery('');
  };

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

      const eventsRes = await restSelect<ActivityEvent>('staff_activity_events', {
        columns: 'id,created_at,event_type,actor_profile_id,actor_role,subject_profile_id,target_kind,target_id,details',
        order: 'created_at.desc',
        limit: PAGE_SIZE,
      });

      // Las lecturas se piden acotadas a los eventos que se van a pintar. Traer
      // "las primeras 1000 lecturas de la cuenta" servía sólo mientras hubiera
      // menos de 1000: pasado ese punto PostgREST devolvía un recorte sin orden
      // — en la práctica el más viejo — que no incluía los eventos recientes,
      // y el feed los mostraba sin leer aunque estuvieran marcados en la base.
      const eventIds = eventsRes.data.map(e => e.id);
      const readsRes = actor && eventIds.length > 0
        ? await restSelect<ReadRow>('staff_activity_event_reads', {
            columns: 'event_id',
            filters: {
              profile_id: `eq.${actor.profileId}`,
              event_id: `in.(${eventIds.join(',')})`,
            },
            limit: eventIds.length,
          })
        : { data: [] as ReadRow[], count: null };

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

  // ── Agrupado por categoría (un bloque por categoría, no un feed único) ──
  // Con una persona elegida, se agrupa SU actividad completa (traída del
  // servidor); si no, la actividad reciente que ya está cargada.
  const activeEvents = selectedPerson ? (personEvents ?? []) : events;

  const eventsByCategory = useMemo(() => {
    const out: Record<Exclude<CategoryFilter, 'all'>, ActivityEvent[]> = {
      content: [], access: [], submissions: [], reviews: [], forum: [],
    };
    for (const ev of activeEvents) {
      const cat = CATEGORY_OF[ev.event_type];
      if (cat) out[cat].push(ev);
    }
    return out;
  }, [activeEvents]);

  // ── Mark as read ─────────────────────────────────────────────────────────
  // Upsert (not plain insert) on purpose: the PK is (event_id, profile_id), and
  // a local `readIds` set that's ever slightly stale (e.g. the reads fetch is
  // capped at 1000 rows) means a plain bulk INSERT can hit an already-existing
  // row — Postgres fails the *whole* statement on that single conflict, so
  // none of the reads persist even though the UI already hid them optimistically.
  const markRead = async (eventId: string) => {
    if (readIds.has(eventId)) return;
    if (!myProfileIdRef.current) return;
    setReadIds(prev => new Set(prev).add(eventId));
    try {
      // Upsert y no insert: readIds sólo cubre la página cargada, así que un
      // evento ya leído en otra sesión llegaría acá como nuevo y el insert
      // moriría con 409 contra la PK (event_id, profile_id).
      await restUpsert(
        'staff_activity_event_reads',
        { event_id: eventId, profile_id: myProfileIdRef.current },
        { onConflict: 'event_id,profile_id', returning: 'minimal' }
      );
    } catch (err) {
      console.warn('[AdminActivity] markRead failed', err);
    }
  };

  const markAllRead = async () => {
    // Resolve the actor at click time instead of trusting a ref that may not
    // have been set yet — previously a null ref silently no-opped the whole
    // button with zero feedback.
    let actorProfileId = myProfileIdRef.current;
    if (!actorProfileId) {
      const actor = await getMyActorInfo();
      if (actor) { actorProfileId = actor.profileId; myProfileIdRef.current = actor.profileId; }
    }
    if (!actorProfileId) {
      toast.error('No se pudo identificar tu usuario, recargá la página');
      return;
    }

    // El marcado lo resuelve el servidor (INSERT ... SELECT con ON CONFLICT DO
    // NOTHING) en vez de armarse acá con los ids de los eventos: el cliente no
    // ve más allá de la página cargada, y esa lista parcial era justamente lo
    // que hacía fallar el lote entero por duplicados.
    const previousReadIds = readIds;
    const previousUnread = trueUnreadCount;

    setReadIds(new Set(events.map(e => e.id)));
    setTrueUnreadCount(0);

    try {
      await restRpc<number>('staff_activity_mark_all_read');
      // Releer el contador real en lugar de asumir 0: un coach sólo marca lo
      // que tiene a cargo, así que puede quedarle pendiente algo fuera de su
      // alcance.
      await refreshTrueUnread();
    } catch (err) {
      console.warn('[AdminActivity] markAllRead failed', err);
      toast.error('No se pudo marcar todo como leído, reintentá');
      // Sin esto la UI mentía: mostraba todo leído mientras la base seguía igual.
      setReadIds(previousReadIds);
      setTrueUnreadCount(previousUnread);
    }
  };

  const handleCardTap = (ev: ActivityEvent) => {
    setSelectedEvent(ev);
    markRead(ev.id);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Status row — el nombre de la sección ya vive en el header, no hace falta repetirlo acá */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Todo lo que pasa en el campus, en vivo. {trueUnreadCount > 0 && (
            <span className="font-bold text-slate-900">{trueUnreadCount} nuevo{trueUnreadCount !== 1 ? 's' : ''} por leer.</span>
          )}
        </p>
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

      {/* Buscar persona: autocompletar y elegir — queda como tag, no filtra letra a letra */}
      <div className="relative" ref={searchBoxRef}>
        {selectedPerson ? (
          <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <span className="inline-flex items-center gap-2 bg-[#00A9CE]/10 text-[#00A9CE] text-sm font-bold pl-3 pr-2 py-1.5 rounded-lg">
              {selectedPerson.name}
              <button onClick={clearPerson} aria-label="Quitar filtro de persona" className="hover:text-[#0099BB]">
                <IoCloseOutline size={16} />
              </button>
            </span>
            <span className="text-xs text-slate-400">
              {loadingPersonEvents ? 'Cargando toda su actividad…' : 'Mostrando toda la actividad de esta persona'}
            </span>
          </div>
        ) : (
          <>
            <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar a una persona por nombre o email..."
              value={personQuery}
              onChange={(e) => setPersonQuery(e.target.value)}
              onFocus={() => personSuggestions.length > 0 && setSuggestOpen(true)}
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30 focus:border-[#00A9CE]/40"
            />
            {personQuery && (
              <button
                onClick={() => { setPersonQuery(''); setSuggestOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <IoCloseOutline size={18} />
              </button>
            )}
            {suggestOpen && personSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-64 overflow-y-auto">
                {personSuggestions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPerson(p)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {p.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-800 truncate">{p.name}</span>
                      {p.email && <span className="block text-xs text-slate-400 truncate">{p.email}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bloques por categoría */}
      {loading || loadingPersonEvents ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-100 border-t-[#00A9CE] rounded-full animate-spin" />
        </div>
      ) : activeEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <IoSparklesOutline size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {selectedPerson ? 'Esta persona no tiene actividad registrada.' : 'Sin actividad todavía.'}
          </p>
          {selectedPerson && (
            <button
              onClick={clearPerson}
              className="mt-3 text-xs font-bold uppercase tracking-wider text-[#00A9CE] hover:underline"
            >
              Quitar filtro
            </button>
          )}
        </div>
      ) : (
        // flex + justify-center (not CSS grid) on purpose: with 5 blocks in
        // 3 columns the last row only has 2 — flex-wrap centers that
        // leftover row instead of leaving it stuck on the left like grid would.
        <div className="flex flex-wrap justify-center gap-4">
          {CATEGORY_BLOCKS.map(block => (
            <div key={block.id} className="w-full lg:w-[calc(33.333%-11px)]">
              <ActivityBlock
                block={block}
                items={eventsByCategory[block.id]}
                unreadCount={unreadByCategory[block.id]}
                readIds={readIds}
                onTap={handleCardTap}
              />
            </div>
          ))}
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
      className={`w-full text-left bg-white rounded-xl border border-slate-200 hover:border-[#00A9CE]/40 hover:shadow-sm transition-all flex items-center gap-4 p-4 h-[76px] ${
        unread ? `border-l-4 ${visuals.border}` : 'opacity-90'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl ${visuals.accent} flex items-center justify-center shrink-0 transition-opacity ${unread ? '' : 'opacity-70'}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight truncate transition-colors ${unread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
          {title}
        </p>
        {secondary && (
          <p className={`text-xs mt-1 truncate ${unread ? 'text-slate-500' : 'text-slate-400'}`}>{secondary}</p>
        )}
      </div>
      <div className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1.5">
        {unread && <span className="w-2 h-2 rounded-full bg-[#00A9CE] animate-pulse" />}
        {timeAgo(ev.created_at)}
      </div>
    </button>
  );
}

function ActivityBlock({
  block, items, unreadCount, readIds, onTap,
}: {
  block: typeof CATEGORY_BLOCKS[number];
  items: ActivityEvent[];
  unreadCount: number;
  readIds: Set<string>;
  onTap: (ev: ActivityEvent) => void;
}) {
  const Icon = block.icon;
  const preview = items.slice(0, BLOCK_PREVIEW_SIZE);
  const remaining = items.length - preview.length;
  const historyHref = `/admin/actividad/historial?cat=${block.id}`;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 flex flex-col">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${block.accent} flex items-center justify-center shrink-0`}>
            <Icon size={18} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{block.label}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold text-white bg-[#00A9CE] rounded-full px-2 py-0.5">
              {unreadCount} nuevo{unreadCount !== 1 ? 's' : ''}
            </span>
          )}
          <a
            href={historyHref}
            title={`Buscar en el historial de ${block.label}`}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <IoTimeOutline size={16} />
          </a>
        </div>
      </div>
      {/* Alto FIJO (no mínimo) para exactamente 3 tarjetas de 76px, con overflow
          recortado — cada tarjeta ahora trunca a una línea así ninguna puede
          crecer más que otra. Esto es lo que garantiza que los bloques queden
          parejos, tengan 0, 1 o 3 elementos. */}
      <div className="p-3 space-y-2 h-[268px] overflow-hidden">
        {preview.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-slate-400 italic">Sin actividad reciente.</p>
          </div>
        ) : (
          preview.map(ev => (
            <ActivityCardList key={ev.id} ev={ev} unread={!readIds.has(ev.id)} onTap={onTap} />
          ))
        )}
      </div>
      {/* Siempre presente (no solo cuando sobra), para que la altura del
          bloque no dependa de si hay overflow o no. */}
      <a
        href={historyHref}
        className="px-4 py-3 border-t border-slate-100 text-center text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
      >
        {remaining > 0 ? `Ver ${remaining} más →` : 'Ver historial →'}
      </a>
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
