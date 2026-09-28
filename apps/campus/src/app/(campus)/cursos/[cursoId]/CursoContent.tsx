'use client';

import { MARKETING_URL } from '@home/services/siteUrls';
import { useCallback, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { markLessonComplete } from '../actions';
import {
  IoArrowForwardOutline,
  IoBookOutline,
  IoCheckmarkCircle,
  IoCheckmarkCircleOutline,
  IoChevronDownOutline,
  IoCloudUploadOutline,
  IoDocumentTextOutline,
  IoEyeOutline,
  IoFlashOutline,
  IoFolderOpenOutline,
  IoJournalOutline,
  IoLinkOutline,
  IoMusicalNotesOutline,
  IoOpenOutline,
  IoSchoolOutline,
  IoTimeOutline,
} from 'react-icons/io5';
import {
  BibliotecaCielo,
  BitacoraMar,
  Brujula,
  HojaLectura,
  MiniaturaVideo,
  OndaAstillero,
  personajeDeMision,
} from './ProgramaIlustraciones';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LessonNode = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number;
  order_index: number;
  requires_submission: boolean;
};

export type ModuleNode = {
  id: string;
  title: string;
  order_index: number;
  module_type: string;
  lessons: LessonNode[];
};

/**
 * Clase de CAMPO — unidad suelta (no vive dentro de un módulo desde el punto de
 * vista del alumno). Siempre tiene entrega: el cuaderno de campo.
 */
export type CampoClass = {
  id: string;
  title: string;
  description: string | null;
  index: number;
  requiresSubmission: boolean;
  dueAt: string | null;
  isLocked: boolean;
  submissionStatus: 'pending_review' | 'reviewed' | 'approved' | null;
  submittedVersions: number;
  isCompleted: boolean;
};

export type ResourceWithContext = {
  id: string;
  title: string;
  file_url: string;
  type: string;
  createdAt: string;
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
};

interface Props {
  cursoId: string;
  modules: ModuleNode[];
  workshopModules: ModuleNode[];
  campoClasses: CampoClass[];
  resources: ResourceWithContext[];
  completedLessonIds: string[];
  nextLessonId: string | null;
  isOrganizer: boolean;
}

type TabId = 'modulos' | 'talleres' | 'campo' | 'archivos';
type Estado = 'done' | 'next' | 'pending';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Kind = 'bitacora' | 'lectura' | 'video';
type TopicInfo = { kind: Kind; title: string; author: string | null; bitN: string | null };

// "BITÁCORA 3 - ESCUCHAR EL VIENTO" → número 3, título "ESCUCHAR EL VIENTO".
const BITACORA_RE = /^bit[aá]cora\s*(\d+)?\s*[-–:.]?\s*/i;
// "LIDERAZGO - JIM SELMAN" → título + autor (lo que va después del último " - ").
const AUTOR_RE = /^(.*\S)\s+[-–]\s+([^-–]+)$/;

/**
 * Tipo de tema. Bitácora = el entregable del módulo (tema con entrega, o que se
 * llama "Bitácora…"); si no, video si tiene video, si no lectura.
 */
function topicInfo(l: LessonNode): TopicInfo {
  const bit = l.title.match(BITACORA_RE);
  if (l.requires_submission || bit) {
    return { kind: 'bitacora', title: (bit && l.title.slice(bit[0].length)) || l.title, author: null, bitN: bit?.[1] ?? null };
  }
  const m = l.title.match(AUTOR_RE);
  return {
    kind: l.video_url ? 'video' : 'lectura',
    title: m ? m[1] : l.title,
    author: m ? m[2].trim() : null,
    bitN: null,
  };
}

// Color de cada módulo (chip, lomo y cinta), en orden y rotando.
const MOD_COLORS = ['#0A7C97', '#4B4FA3', '#8A5A0F', '#9B3D5A', '#2F7D5B'];

const RESOURCE_TYPE: Record<string, { label: string; action: string; Icon: typeof IoLinkOutline }> = {
  pdf:   { label: 'PDF',   action: 'Abrir PDF',      Icon: IoDocumentTextOutline },
  audio: { label: 'Audio', action: 'Escuchar audio', Icon: IoMusicalNotesOutline },
  link:  { label: 'Link',  action: 'Abrir enlace',   Icon: IoLinkOutline },
};

function resolveType(r: ResourceWithContext) {
  const explicit = r.type?.toLowerCase();
  if (explicit && RESOURCE_TYPE[explicit]) return RESOURCE_TYPE[explicit];
  const url = r.file_url.toLowerCase();
  if (/\.(pdf)(\?|$)/.test(url)) return RESOURCE_TYPE.pdf;
  if (/\.(mp3|wav|m4a|ogg)(\?|$)/.test(url)) return RESOURCE_TYPE.audio;
  return RESOURCE_TYPE.link;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CursoContent({
  cursoId,
  modules,
  workshopModules,
  campoClasses,
  resources,
  completedLessonIds,
  nextLessonId,
  isOrganizer,
}: Props) {
  // Las clases marcadas desde el desplegable, mientras el server action va y
  // vuelve. Se unen a las que ya vinieron del servidor para que el tilde, los
  // contadores del módulo y la barra de progreso se muevan en el acto; si la
  // acción falla, se saca y todo vuelve a como estaba.
  const [justMarked, setJustMarked] = useState<Set<string>>(() => new Set());
  const [, startMarking] = useTransition();

  const completedSet = useMemo(
    () => new Set([...completedLessonIds, ...justMarked]),
    [completedLessonIds, justMarked]
  );

  const markSeen = useCallback((lessonId: string) => {
    setJustMarked((prev) => (prev.has(lessonId) ? prev : new Set(prev).add(lessonId)));
    startMarking(async () => {
      const res = await markLessonComplete(lessonId, cursoId);
      if (res?.error) {
        setJustMarked((prev) => {
          const next = new Set(prev);
          next.delete(lessonId);
          return next;
        });
      }
    });
  }, [cursoId]);
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0)
                     + workshopModules.reduce((s, m) => s + m.lessons.length, 0)
                     + campoClasses.length;
  const completedCount = completedSet.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const counts = {
    modulos: modules.length,
    talleres: workshopModules.length,
    campo: campoClasses.length,
    archivos: resources.length,
  };

  // Cada pestaña con su color. Los nombres son los del barco: Astillero
  // (talleres) y Misiones (CAMPO); en la base siguen siendo workshop / campo.
  const tabs: { id: TabId; label: string; short: string; Icon: typeof IoSchoolOutline; count: number; bg: string; fg: string; badge: string }[] = [
    { id: 'modulos',  label: 'Módulos',                  short: 'Módulos',   Icon: IoSchoolOutline,     count: counts.modulos,  bg: '#0A7C97', fg: '#FFFFFF', badge: 'rgba(255,255,255,0.22)' },
    { id: 'talleres', label: 'Astillero',                short: 'Astillero', Icon: IoFlashOutline,      count: counts.talleres, bg: '#F5A524', fg: '#3B2100', badge: 'rgba(59,33,0,0.14)' },
    { id: 'campo',    label: 'Misiones',                 short: 'Misiones',  Icon: IoJournalOutline,    count: counts.campo,    bg: '#7C3AED', fg: '#FFFFFF', badge: 'rgba(255,255,255,0.22)' },
    { id: 'archivos', label: 'Archivos institucionales', short: 'Archivos',  Icon: IoFolderOpenOutline, count: counts.archivos, bg: '#0B7A55', fg: '#FFFFFF', badge: 'rgba(255,255,255,0.22)' },
  ];

  const [tab, setTab] = useState<TabId>('modulos');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_408px] gap-8 items-start">
      <div className="flex flex-col gap-5 min-w-0">
        {/* ── Pestañas ─────────────────────────────────────────────────────── */}
        <div role="tablist" aria-label="Contenido del programa" className="self-start max-w-full overflow-x-auto hide-scrollbar bg-white border border-slate-200 rounded-[20px] p-1.5 flex gap-1 shadow-[0_6px_20px_rgba(15,23,42,0.06)]">
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-2 min-h-12 px-4 rounded-[15px] text-sm font-bold whitespace-nowrap transition-colors ${
                  on ? '' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                style={on ? { background: t.bg, color: t.fg, boxShadow: `0 4px 12px ${t.bg}59` } : undefined}
              >
                <t.Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
                <span
                  className={`text-[11px] font-bold rounded-[10px] px-[7px] py-0.5 ${on ? '' : 'bg-slate-100 text-slate-600'}`}
                  style={on ? { background: t.badge, color: t.fg } : undefined}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {tab === 'modulos' && (
          <ModulosTab
            cursoId={cursoId}
            modules={modules}
            completedSet={completedSet}
            nextLessonId={nextLessonId}
            isOrganizer={isOrganizer}
          />
        )}
        {tab === 'talleres' && (
          <AstilleroTab
            cursoId={cursoId}
            workshopModules={workshopModules}
            completedSet={completedSet}
            nextLessonId={nextLessonId}
            isOrganizer={isOrganizer}
            onMarkSeen={markSeen}
          />
        )}
        {tab === 'campo' && (
          <MisionesTab cursoId={cursoId} campoClasses={campoClasses} isOrganizer={isOrganizer} />
        )}
        {tab === 'archivos' && <BibliotecaTab resources={resources} />}
      </div>

      {/* ── Lateral ──────────────────────────────────────────────────────── */}
      <aside className="flex flex-col gap-6">
        {isOrganizer ? (
          <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-6 flex flex-col gap-2.5">
            <h3 className="flex items-center gap-2.5 text-lg font-bold text-amber-800">
              <IoEyeOutline size={18} /> Vista organizador
            </h3>
            <p className="text-sm leading-relaxed text-amber-700">
              Estás explorando este programa como organizador. El progreso de los alumnos no se modifica.
            </p>
            <a
              href={`${MARKETING_URL}/admin/lms/actividad?course=${cursoId}`}
              className="inline-flex items-center gap-1.5 min-h-9 text-[13px] font-bold text-amber-800 hover:underline"
            >
              Ver actividad de alumnos <IoArrowForwardOutline size={14} />
            </a>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Tu progreso</h3>
            <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
              <span>Temas completados</span>
              <span className="font-bold">{completedCount}/{totalLessons}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-right text-xs text-slate-500 font-medium mt-2">{progressPercent}% completado</p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-[20px] p-6 flex flex-col gap-1.5 shadow-sm">
          <h3 className="text-[15px] font-bold text-slate-900 pb-2">Contenidos disponibles</h3>
          <SideRow Icon={IoSchoolOutline} label="Módulos" count={counts.modulos} chip="bg-cyan-100 text-cyan-700" num="text-cyan-700" onClick={() => setTab('modulos')} />
          <SideRow Icon={IoFlashOutline} label="Talleres" count={counts.talleres} chip="bg-amber-100 text-amber-800" num="text-amber-700" onClick={() => setTab('talleres')} />
          <SideRow Icon={IoJournalOutline} label="Misiones" count={counts.campo} chip="bg-violet-100 text-violet-700" num="text-violet-700" onClick={() => setTab('campo')} />
          <SideRow Icon={IoFolderOpenOutline} label="Archivos" count={counts.archivos} chip="bg-emerald-100 text-emerald-700" num="text-emerald-700" onClick={() => setTab('archivos')} />
        </div>
      </aside>
    </div>
  );
}

// ─── Piezas comunes ──────────────────────────────────────────────────────────

function SideRow({
  Icon, label, count, chip, num, onClick,
}: {
  Icon: typeof IoSchoolOutline; label: string; count: number; chip: string; num: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3.5 w-full min-h-[52px] px-1 py-1.5 rounded-xl text-left hover:bg-slate-50 transition-colors"
    >
      <span className={`w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center ${chip}`}>
        <Icon size={18} />
      </span>
      <span className="flex-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">{label}</span>
      <span className={`text-xl font-bold pr-1 tabular-nums ${num}`}>{count}</span>
    </button>
  );
}

/** Tilde verde, "en curso" o círculo vacío; `next` y `pending` son clases de color. */
function EstadoIcon({ estado, next, pending }: { estado: Estado; next: string; pending: string }) {
  if (estado === 'done') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" role="img" aria-label="Completado" className="relative shrink-0">
        <circle cx="12" cy="12" r="11" fill="#10A36F" />
        <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (estado === 'next') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" role="img" aria-label="En curso" className={`relative shrink-0 ${next}`}>
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" role="img" aria-label="Pendiente" className={`relative shrink-0 ${pending}`}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * Plegado de una lista de módulos. Arrancan cerrados salvo `initialOpenId`, así
 * el índice completo del curso entra en pantalla sin tanto scroll.
 */
function useModuleToggles(modules: ModuleNode[], initialOpenId: string | null) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => (initialOpenId ? new Set([initialOpenId]) : new Set()));

  const toggle = (id: string) => setOpenIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const allOpen = modules.length > 0 && modules.every((m) => openIds.has(m.id));
  const toggleAll = () => setOpenIds(allOpen ? new Set() : new Set(modules.map((m) => m.id)));

  return { openIds, toggle, allOpen, toggleAll };
}

function ToggleAllButton({ allOpen, onClick }: { allOpen: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 min-h-11 px-1 text-[13px] font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap transition-colors shrink-0"
    >
      <IoChevronDownOutline size={14} className={`transition-transform ${allOpen ? 'rotate-180' : ''}`} />
      {allOpen ? 'Contraer todo' : 'Expandir todo'}
    </button>
  );
}

function Chevron({ open, className = '' }: { open: boolean; className?: string }) {
  return <IoChevronDownOutline size={18} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${className}`} />;
}

// ─── MÓDULOS ─────────────────────────────────────────────────────────────────

type Filtro = 'todo' | Kind;

const FILTROS: { id: Filtro; label: string; dot: string }[] = [
  { id: 'todo',     label: 'Todo',      dot: '' },
  { id: 'lectura',  label: 'Lecturas',  dot: 'bg-[#C9A45A]' },
  { id: 'video',    label: 'Videos',    dot: 'bg-[#0A7C97]' },
  { id: 'bitacora', label: 'Bitácoras', dot: 'bg-[#0C2733] dark:bg-[#F2C46B]' },
];

function ModulosTab({
  cursoId, modules, completedSet, nextLessonId, isOrganizer,
}: {
  cursoId: string;
  modules: ModuleNode[];
  completedSet: Set<string>;
  nextLessonId: string | null;
  isOrganizer: boolean;
}) {
  // Módulo en curso: el primero sin terminar cuyos anteriores están completos.
  const currentModuleId = useMemo(() => {
    if (isOrganizer) return null;
    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      const done = mod.lessons.filter((l) => completedSet.has(l.id)).length;
      if (done < mod.lessons.length && (i === 0 || modules[i - 1].lessons.every((l) => completedSet.has(l.id)))) {
        return mod.id;
      }
    }
    return null;
  }, [modules, completedSet, isOrganizer]);

  const { openIds, toggle, allOpen, toggleAll } = useModuleToggles(modules, currentModuleId ?? modules[0]?.id ?? null);
  const [filtro, setFiltro] = useState<Filtro>('todo');

  // Tipo de cada tema + número de bitácora (el del título, o su orden en el programa).
  const infoById = useMemo(() => {
    const map = new Map<string, TopicInfo>();
    let bitacoras = 0;
    for (const m of modules) {
      for (const l of m.lessons) {
        const info = topicInfo(l);
        if (info.kind === 'bitacora') {
          bitacoras++;
          if (!info.bitN) info.bitN = String(bitacoras);
        }
        map.set(l.id, info);
      }
    }
    return map;
  }, [modules]);

  const totals = useMemo(() => {
    const t: Record<Filtro, number> = { todo: 0, lectura: 0, video: 0, bitacora: 0 };
    for (const info of infoById.values()) { t.todo++; t[info.kind]++; }
    return t;
  }, [infoById]);

  if (modules.length === 0) {
    return <EmptyState icon={<IoSchoolOutline size={36} />} title="Contenido en preparación" message="Los módulos de este programa estarán disponibles pronto." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Estantería: un lomo por módulo, alto según cuántos temas tiene */}
      <div className="bg-white border border-slate-200 rounded-2xl px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-end justify-between gap-6 shadow-sm">
        <div className="flex flex-col gap-2 max-w-[380px] sm:pb-1.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0A7C97] dark:text-[#7DD3E8]">Estantería del programa</p>
          <h2 className="font-serif text-[30px] leading-[1.1] text-slate-900">Cada lomo es un módulo</h2>
          <p className="text-sm leading-normal text-slate-600">Su altura marca cuántos temas tiene. Tocá uno para abrirlo.</p>
        </div>
        <div className="shrink-0 self-start sm:self-auto max-w-full overflow-x-auto hide-scrollbar pt-3">
          <div className="flex items-end gap-2 px-3">
            {modules.map((m, i) => {
              const open = openIds.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  aria-expanded={open}
                  aria-label={`Módulo ${m.order_index}, ${plural(m.lessons.length, 'tema', 'temas')}`}
                  className="flex flex-col items-center justify-between w-10 py-2 rounded-t-[3px] text-white transition-[transform,box-shadow] duration-200 shrink-0"
                  style={{
                    background: MOD_COLORS[i % MOD_COLORS.length],
                    height: 60 + Math.min(m.lessons.length, 12) * 8,
                    transform: open ? 'translateY(-10px)' : undefined,
                    boxShadow: open ? '0 0 0 2px #F7DDA0, 0 8px 16px rgba(15,23,42,0.25)' : 'inset -3px 0 0 rgba(0,0,0,0.16)',
                  }}
                >
                  <span className="w-full h-[3px] bg-[#E8C170]" />
                  <span className="text-[13px] font-bold">{m.order_index}</span>
                  <span className="w-full h-[3px] bg-[#E8C170]" />
                </button>
              );
            })}
          </div>
          <div className="h-2 rounded-sm bg-[#8A6A45] border-t-2 border-[#A98761]" />
        </div>
      </div>

      {/* Filtro por tipo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Filtrar por tipo de contenido" className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => {
            const on = filtro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFiltro(f.id)}
                className={`flex items-center gap-2 min-h-11 px-3.5 rounded-xl border text-[13px] font-bold transition-colors ${
                  on ? 'bg-slate-900 border-slate-900 text-slate-50' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                {f.dot && <span className={`w-[9px] h-[9px] rounded-full ${f.dot}`} />}
                {f.label}
                <span className={`text-[11px] font-bold rounded-lg px-[7px] py-0.5 ${on ? 'bg-slate-50/20' : 'bg-slate-100 text-slate-600'}`}>
                  {totals[f.id]}
                </span>
              </button>
            );
          })}
        </div>
        <ToggleAllButton allOpen={allOpen} onClick={toggleAll} />
      </div>

      {modules.map((mod, i) => {
        const modCompleted = mod.lessons.filter((l) => completedSet.has(l.id)).length;
        const modTotal = mod.lessons.length;
        const complete = !isOrganizer && modTotal > 0 && modCompleted === modTotal;
        const isCurrent = mod.id === currentModuleId;
        const isOpen = openIds.has(mod.id);
        const color = MOD_COLORS[i % MOD_COLORS.length];

        const c = { bitacora: 0, lectura: 0, video: 0 };
        let secs = 0;
        for (const l of mod.lessons) {
          const k = infoById.get(l.id)!.kind;
          c[k]++;
          if (k === 'video') secs += l.duration_seconds || 0;
        }
        const summary = [
          c.bitacora && plural(c.bitacora, 'bitácora', 'bitácoras'),
          c.lectura && plural(c.lectura, 'lectura', 'lecturas'),
          c.video && plural(c.video, 'video', 'videos'),
          secs >= 60 && `${formatDuration(secs)} de video`,
        ].filter(Boolean).join(' · ');

        const topics = mod.lessons.filter((l) => filtro === 'todo' || infoById.get(l.id)!.kind === filtro);

        return (
          <div
            key={mod.id}
            className={`relative bg-white rounded-2xl overflow-hidden ${
              isCurrent
                ? 'border-[1.5px] border-[#7DD3E8] dark:border-[#0A7C97] shadow-[0_0_0_4px_rgba(10,165,199,0.08)]'
                : 'border border-slate-200 shadow-sm'
            }`}
          >
            {isOpen && (
              <div
                aria-hidden="true"
                className="absolute top-0 right-[76px] w-4 h-[30px]"
                style={{ background: color, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)' }}
              />
            )}
            <button
              type="button"
              onClick={() => toggle(mod.id)}
              aria-expanded={isOpen}
              className="w-full text-left px-4 sm:px-6 py-5 flex items-center gap-4 sm:gap-[18px] min-h-24 text-slate-900"
            >
              <span className="w-12 h-12 rounded-[14px] shrink-0 hidden sm:flex items-center justify-center text-white" style={{ background: color }}>
                <IoBookOutline size={22} />
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-[5px]">
                <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${isCurrent ? 'text-[#0A7C97] dark:text-[#7DD3E8]' : 'text-slate-500'}`}>
                  Módulo {mod.order_index}{isCurrent && ' · Actual'}
                </span>
                <span className="text-[19px] font-bold leading-tight">{mod.title}</span>
                {summary && <span className="text-xs text-slate-500">{summary}</span>}
              </span>
              <span className={`flex items-center gap-1.5 text-[13px] font-bold whitespace-nowrap ${
                complete ? 'text-emerald-700' : isCurrent ? 'text-[#0A7C97] dark:text-[#7DD3E8]' : 'text-slate-500'
              }`}>
                {complete && <IoCheckmarkCircle size={16} className="text-[#10A36F]" />}
                {isOrganizer ? plural(modTotal, 'tema', 'temas') : `${modCompleted}/${modTotal}`}
              </span>
              <Chevron open={isOpen} className="text-slate-500" />
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 px-4 sm:px-5 pt-4 pb-5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {topics.map((l) => {
                  const estado: Estado = isOrganizer ? 'pending'
                    : completedSet.has(l.id) ? 'done'
                    : l.id === nextLessonId ? 'next'
                    : 'pending';
                  return (
                    <TopicCard
                      key={l.id}
                      href={`/cursos/${cursoId}/${l.id}`}
                      lesson={l}
                      info={infoById.get(l.id)!}
                      estado={estado}
                    />
                  );
                })}
                {topics.length === 0 && (
                  <p className="col-span-full p-4 text-center text-[13px] text-slate-500">No hay contenido de este tipo en este módulo.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Tarjeta de un tema: bitácora (oscura, a lo ancho), lectura (papel) o video (miniatura). */
function TopicCard({ href, lesson, info, estado }: { href: string; lesson: LessonNode; info: TopicInfo; estado: Estado }) {
  const num = pad(lesson.order_index);
  const isNext = estado === 'next';

  if (info.kind === 'bitacora') {
    return (
      <Link
        href={href}
        className="col-span-full relative overflow-hidden flex items-center gap-4 px-5 py-[18px] min-h-24 rounded-[14px] bg-[#0C2733] hover:bg-[#10303F] transition-colors"
      >
        <BitacoraMar />
        <EstadoIcon estado={estado} next="text-[#F2C46B]" pending="text-[#5B7A88]" />
        <Brujula />
        <span className="relative flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F2C46B]">
            Bitácora {info.bitN} · Entrega
          </span>
          <span className="font-serif text-2xl sm:text-[26px] leading-[1.1] text-white">{info.title}</span>
        </span>
        {isNext && (
          <span className="relative hidden sm:flex items-center gap-2 min-h-11 px-[18px] rounded-xl bg-[#F2C46B] text-[#1F1300] text-sm font-bold shrink-0">
            Continuar <IoArrowForwardOutline size={15} />
          </span>
        )}
      </Link>
    );
  }

  const ring = isNext ? 'ring-2 ring-[#00A9CE]' : '';

  if (info.kind === 'lectura') {
    return (
      <Link
        href={href}
        className={`flex items-center gap-3.5 px-4 py-3.5 min-h-[84px] rounded-[14px] border transition-colors bg-[#FBF7EE] border-[#EEE3CB] hover:border-[#D6C49C] dark:bg-[#172033] dark:border-[#293548] dark:hover:border-[#3b4a61] ${ring}`}
      >
        <EstadoIcon estado={estado} next="text-[#00A9CE]" pending="text-[#D3C6A6] dark:text-[#3b4a61]" />
        <HojaLectura />
        <span className="min-w-0 flex flex-col gap-[3px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A5A0F] dark:text-[#E3B866]">
            Lectura · {num}{isNext && ' · Continuar'}
          </span>
          <span className="text-sm font-bold leading-snug text-slate-800">{info.title}</span>
          {info.author && <span className="text-xs text-[#6B5B3E] dark:text-[#a3b0c2]">{info.author}</span>}
        </span>
      </Link>
    );
  }

  const meta = [formatDuration(lesson.duration_seconds), info.author].filter(Boolean).join(' · ');
  return (
    <Link
      href={href}
      className={`flex items-center gap-3.5 px-4 py-3.5 min-h-[84px] rounded-[14px] border transition-colors bg-[#F0F7FA] border-[#D4E7EE] hover:border-[#9FC9D8] dark:bg-[#0F2530] dark:border-[#1D3D4A] dark:hover:border-[#2F5F72] ${ring}`}
    >
      <EstadoIcon estado={estado} next="text-[#00A9CE]" pending="text-[#B5D3DE] dark:text-[#2F5563]" />
      <MiniaturaVideo />
      <span className="min-w-0 flex flex-col gap-[3px]">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A5F75] dark:text-[#7DD3E8]">
          Video · {num}{isNext && ' · Continuar'}
        </span>
        <span className="text-sm font-bold leading-snug text-slate-800">{info.title}</span>
        {meta && (
          <span className="flex items-center gap-[5px] text-xs text-[#4B6470] dark:text-[#9FB8C2]">
            <IoTimeOutline size={12} /> {meta}
          </span>
        )}
      </span>
    </Link>
  );
}

// ─── ASTILLERO (talleres) ────────────────────────────────────────────────────

function AstilleroTab({
  cursoId, workshopModules, completedSet, nextLessonId, isOrganizer, onMarkSeen,
}: {
  cursoId: string;
  workshopModules: ModuleNode[];
  completedSet: Set<string>;
  nextLessonId: string | null;
  isOrganizer: boolean;
  onMarkSeen: (lessonId: string) => void;
}) {
  // Todos cerrados de entrada: los talleres son complementarios y son varios,
  // así que abrir uno solo porque ahí cayó la próxima clase dejaba la lista
  // desbalanceada y empujaba el resto fuera de pantalla. Se ven los títulos
  // y cada uno se abre a mano. ("Expandir todo" sigue estando arriba.)
  const { openIds, toggle, allOpen, toggleAll } = useModuleToggles(workshopModules, null);

  if (workshopModules.length === 0) {
    return <EmptyState icon={<IoFlashOutline size={36} />} title="Sin talleres todavía" message="Cuando se publiquen talleres complementarios al programa, los vas a ver acá." />;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-600">Módulos prácticos que complementan el programa.</p>
        <ToggleAllButton allOpen={allOpen} onClick={toggleAll} />
      </div>
      <OndaAstillero />
      {workshopModules.map((mod) => {
        const modCompleted = !isOrganizer ? mod.lessons.filter((l) => completedSet.has(l.id)).length : 0;
        const modTotal = mod.lessons.length;
        const allDone = !isOrganizer && modTotal > 0 && modCompleted === modTotal;
        const isOpen = openIds.has(mod.id);
        return (
          <div key={mod.id} className="relative rounded-2xl overflow-hidden border bg-[#FFFCF2] border-[#F8E1A0] dark:bg-[#0f172a] dark:border-[#293548]">
            <button
              type="button"
              onClick={() => toggle(mod.id)}
              aria-expanded={isOpen}
              className="w-full text-left px-4 sm:px-6 py-[22px] flex items-center gap-4 sm:gap-[18px] min-h-[92px] text-slate-900"
            >
              <span className="w-12 h-12 rounded-[14px] shrink-0 hidden sm:flex items-center justify-center bg-[#FDECB8] text-[#8A4B08] dark:bg-[#F5A524]/15 dark:text-[#F5C76B]">
                <AnclaIcon />
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309] dark:text-[#F5A524]">Taller</span>
                <span className="text-xl font-bold tracking-[0.01em]">{mod.title}</span>
              </span>
              <span className={`flex items-center gap-1.5 text-xs font-bold whitespace-nowrap ${allDone ? 'text-emerald-700' : 'text-[#B45309] dark:text-[#F5A524]'}`}>
                {allDone && <IoCheckmarkCircle size={16} className="text-[#10A36F]" />}
                {isOrganizer ? plural(modTotal, 'tema', 'temas') : `${modCompleted}/${modTotal} temas`}
              </span>
              <Chevron open={isOpen} className="text-[#B45309] dark:text-[#F5A524]" />
            </button>
            {isOpen && (
              <div className="border-t border-[#F8E9BE] dark:border-[#293548] px-4 sm:px-5 pt-4 pb-5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {mod.lessons.map((lesson) => {
                  const isDone = !isOrganizer && completedSet.has(lesson.id);
                  const isNext = !isOrganizer && lesson.id === nextLessonId;
                  const estado: Estado = isDone ? 'done' : isNext ? 'next' : 'pending';
                  return (
                    /* Fila = contenedor, no <Link>: el botón de "Marcar vista"
                       no puede ir anidado dentro de un enlace (el click se lo
                       comería la navegación, y anidar interactivos es HTML
                       inválido). El enlace ocupa el área del texto; el botón
                       vive al lado. */
                    <div
                      key={lesson.id}
                      className={`flex items-center gap-2 px-4 py-3.5 min-h-[72px] rounded-[14px] border bg-[#FFF6DA] border-[#F6E3A8] dark:bg-[#172033] dark:border-[#293548] ${isNext ? 'ring-2 ring-[#F5A524]' : ''}`}
                    >
                      <Link href={`/cursos/${cursoId}/${lesson.id}`} className="flex items-center gap-3.5 min-w-0 flex-1 group">
                        <EstadoIcon estado={estado} next="text-[#F5A524]" pending="text-[#E9CD82] dark:text-[#3b4a61]" />
                        <span className="min-w-0 flex flex-col gap-[3px]">
                          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A4B08] dark:text-[#F5C76B]">
                            {lesson.video_url ? 'Video' : 'Lectura'} · {pad(lesson.order_index)}
                            {lesson.video_url && lesson.duration_seconds > 0 && ` · ${formatDuration(lesson.duration_seconds)}`}
                          </span>
                          <span className="text-sm font-bold text-slate-800 group-hover:underline">{lesson.title}</span>
                        </span>
                      </Link>
                      {!isOrganizer && !isDone && (
                        <button
                          type="button"
                          onClick={() => onMarkSeen(lesson.id)}
                          title={`Marcar "${lesson.title}" como vista`}
                          aria-label={`Marcar "${lesson.title}" como vista`}
                          className="flex items-center gap-1.5 min-h-9 text-xs font-bold text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 bg-white/60 hover:bg-emerald-50 rounded-lg px-2.5 shrink-0 transition-colors"
                        >
                          <IoCheckmarkCircleOutline size={16} />
                          <span className="hidden xl:inline">Marcar vista</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnclaIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="5" r="2" /><path d="M12 7v14" /><path d="M8.5 11h7" /><path d="M4.5 14.5a7.5 7.5 0 0015 0" />
    </svg>
  );
}

// ─── MISIONES (CAMPO) ────────────────────────────────────────────────────────
// Cada clase de CAMPO es una unidad suelta (no hay módulos): una tarjeta con su
// propia entrega, donde el alumno sube el cuaderno de campo, y su personaje.

const TZ = 'America/Argentina/Buenos_Aires';

function fmtDue(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: TZ,
  });
}

function MisionesTab({
  cursoId, campoClasses, isOrganizer,
}: {
  cursoId: string;
  campoClasses: CampoClass[];
  isOrganizer: boolean;
}) {
  if (campoClasses.length === 0) {
    return <EmptyState icon={<IoJournalOutline size={36} />} title="Sin misiones todavía" message="Cuando se publiquen las clases de CAMPO, las vas a ver acá para subir tu cuaderno de campo." />;
  }

  const entregadas = campoClasses.filter((c) => c.submissionStatus !== null).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-violet-200 rounded-2xl px-6 py-5 flex items-start gap-4">
        <span className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
          <IoJournalOutline size={20} />
        </span>
        <div className="flex-1 flex flex-col gap-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">Cuadernos de campo</p>
          <p className="text-sm leading-normal text-slate-600">
            Cada clase de CAMPO es independiente y tiene su propia entrega: subí ahí el cuaderno de campo con tu trabajo.
          </p>
        </div>
        {!isOrganizer && (
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-violet-200 text-xs font-bold text-violet-700 tabular-nums shrink-0">
            {entregadas}/{campoClasses.length} entregadas
          </span>
        )}
      </div>

      {campoClasses.map((c) => {
        const hasSubmission = c.submissionStatus !== null;
        const { Escena } = personajeDeMision(c.index);

        return (
          <div
            key={c.id}
            className={`flex flex-col sm:flex-row bg-white border border-violet-200 rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(76,29,149,0.06)] ${c.isLocked ? 'opacity-70' : ''}`}
          >
            {/* lado del cuaderno */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="px-6 sm:px-7 pt-6 pb-[18px] flex items-center gap-4">
                <span className={`w-12 h-12 rounded-[14px] text-xl font-bold flex items-center justify-center shrink-0 ${
                  c.isLocked ? 'bg-slate-100 text-slate-500' : 'bg-[#7C3AED] text-white'
                }`}>
                  {c.index}
                </span>
                <div className="min-w-0 flex flex-col gap-1">
                  <p className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${c.isLocked ? 'text-slate-500' : 'text-violet-700'}`}>
                    <IoBookOutline size={14} /> Clase de CAMPO
                  </p>
                  <h3 className="font-serif text-3xl sm:text-4xl leading-none text-slate-900">{c.title}</h3>
                </div>
              </div>
              <div className="px-6 sm:px-7 pb-6 flex flex-col gap-3">
                {c.isLocked ? (
                  <p className="text-sm text-slate-500">Todavía no está disponible.</p>
                ) : (
                  <>
                    {c.description && <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{c.description}</p>}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-semibold">
                      {c.requiresSubmission ? (
                        <span className="flex items-center gap-1.5 text-violet-700">
                          <IoCloudUploadOutline size={15} /> Requiere cuaderno de campo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <IoDocumentTextOutline size={15} /> Clase sin entrega
                        </span>
                      )}
                      {c.requiresSubmission && (
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <IoTimeOutline size={15} /> {c.dueAt ? `Fecha límite: ${fmtDue(c.dueAt)}` : 'Sin fecha límite'}
                        </span>
                      )}
                      {c.submittedVersions > 1 && (
                        <span className="text-slate-500">{c.submittedVersions} versiones enviadas</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      {c.requiresSubmission && (
                        <Link
                          href={`/cursos/${cursoId}/${c.id}?tab=entrega`}
                          className="flex items-center gap-2 min-h-11 px-[18px] rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-bold transition-colors"
                        >
                          <IoCloudUploadOutline size={16} />
                          {isOrganizer ? 'Ver entregas de la clase' : hasSubmission ? 'Ver mi entrega' : 'Subir cuaderno de campo'}
                        </Link>
                      )}
                      <Link
                        href={`/cursos/${cursoId}/${c.id}`}
                        className={`flex items-center gap-2 min-h-11 px-[18px] rounded-xl text-sm font-bold transition-colors ${
                          c.requiresSubmission
                            ? 'bg-white border border-violet-200 text-slate-700 hover:border-violet-400'
                            : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
                        }`}
                      >
                        Ver la clase <IoArrowForwardOutline size={16} />
                      </Link>
                      {c.isCompleted && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <IoCheckmarkCircle size={16} /> Clase completada
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* lado del personaje */}
            <div aria-hidden="true" className={`relative order-first sm:order-none h-40 sm:h-auto sm:w-[300px] shrink-0 overflow-hidden ${c.isLocked ? 'grayscale' : ''}`}>
              <Escena />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ARCHIVOS INSTITUCIONALES: la biblioteca ─────────────────────────────────

// Lomos: color, texto y banda; ancho, alto y corrimiento varían para que el
// estante no quede en fila india. Rotan si hay más documentos.
const LIBROS = [
  { bg: '#E0A93B', fg: '#1F1300', band: '#7A5210', w: 240, h: 56, dx: 6 },
  { bg: '#0B7A55', fg: '#FFFFFF', band: '#E8C170', w: 256, h: 52, dx: 0 },
  { bg: '#0A7C97', fg: '#FFFFFF', band: '#E8C170', w: 248, h: 58, dx: 10 },
  { bg: '#9B3D5A', fg: '#FFFFFF', band: '#E8C170', w: 236, h: 54, dx: 4 },
  { bg: '#4B4FA3', fg: '#FFFFFF', band: '#E8C170', w: 252, h: 50, dx: 8 },
  { bg: '#2F7D5B', fg: '#FFFFFF', band: '#E8C170', w: 244, h: 56, dx: 2 },
];
const LIBROS_POR_ESTANTE = 6;

function BibliotecaTab({ resources }: { resources: ResourceWithContext[] }) {
  const [selId, setSelId] = useState<string | null>(resources[0]?.id ?? null);

  if (resources.length === 0) {
    return (
      <EmptyState
        icon={<IoFolderOpenOutline size={36} />}
        title="Sin archivos institucionales"
        message="Cuando la organización publique reglas, contratos o documentos importantes, los vas a ver acá."
      />
    );
  }

  const selIndex = Math.max(0, resources.findIndex((r) => r.id === selId));
  const sel = resources[selIndex];
  const selType = resolveType(sel);
  const showModule = new Set(resources.map((r) => r.moduleId)).size > 1;

  const estantes: ResourceWithContext[][] = [];
  for (let i = 0; i < resources.length; i += LIBROS_POR_ESTANTE) estantes.push(resources.slice(i, i + LIBROS_POR_ESTANTE));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-5 flex items-start gap-4">
        <span className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <IoFolderOpenOutline size={20} />
        </span>
        <div className="flex-1 flex flex-col gap-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Documentos del programa</p>
          <p className="text-sm leading-normal text-slate-600 max-w-[480px]">
            Reglas de convivencia, contratos, criterios de certificación y otros documentos importantes para vos.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs font-bold text-emerald-700 whitespace-nowrap">
          {plural(resources.length, 'doc', 'docs')}
        </span>
      </div>

      <div className="relative overflow-hidden bg-[#0C2733] rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row gap-6">
        <BibliotecaCielo />
        <div className="relative md:w-[360px] shrink-0 flex flex-col gap-6 pt-8">
          {estantes.map((libros, e) => (
            <div key={e} className="relative pb-[17px]">
              <div className="flex flex-col items-start sm:pr-16">
                {libros.map((r, i) => {
                  const idx = e * LIBROS_POR_ESTANTE + i;
                  const L = LIBROS[idx % LIBROS.length];
                  const on = r.id === sel.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelId(r.id)}
                      aria-pressed={on}
                      aria-label={`Ver ${r.title}`}
                      className="flex items-center rounded-l-[4px] rounded-r-[7px] px-3.5 text-xs font-bold transition-[transform,box-shadow] duration-200 max-w-[calc(100%-16px)]"
                      style={{
                        width: L.w, height: L.h, marginLeft: L.dx, background: L.bg, color: L.fg,
                        transform: on ? 'translateX(16px)' : undefined,
                        boxShadow: on ? '0 0 0 2px #F7DDA0, 0 0 24px rgba(242,196,107,0.45)' : 'inset 0 -3px 0 rgba(0,0,0,0.18)',
                      }}
                    >
                      <span className="w-[3px] h-full shrink-0" style={{ background: L.band }} />
                      <span className="flex-1 text-left pl-3 truncate">#{pad(idx + 1)}&nbsp;&nbsp;{r.title}</span>
                      <span className="w-[3px] h-full shrink-0" style={{ background: L.band }} />
                    </button>
                  );
                })}
              </div>
              <div aria-hidden="true" className="absolute right-1 bottom-[17px] hidden sm:flex items-end gap-[3px]">
                <div className="w-5 h-28 rounded-[3px] bg-[#9B3D5A]" />
                <div className="w-[18px] h-[92px] rounded-[3px] bg-[#4B4FA3]" />
                <div className="w-[18px] h-[102px] rounded-[3px] bg-[#E0A93B] ml-1 rotate-[9deg] origin-bottom-left" />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-3.5 rounded-[3px] bg-[#8A6A45] border-t-[3px] border-[#A98761]" />
            </div>
          ))}
        </div>

        <div aria-live="polite" className="relative flex-1 min-w-0 self-start bg-white rounded-2xl p-6 flex flex-col gap-3">
          <span className="self-start text-[11px] font-bold uppercase tracking-[0.08em] rounded-md px-2 py-1 bg-sky-100 text-sky-800">
            {selType.label} · #{pad(selIndex + 1)}
          </span>
          <p className="text-xl font-bold leading-snug text-slate-900">{sel.title}</p>
          {showModule && <p className="text-xs text-slate-500">{sel.moduleTitle}</p>}
          <a
            href={sel.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 flex items-center justify-center gap-2 min-h-11 rounded-xl bg-[#0B7A55] hover:bg-[#096547] text-white text-sm font-bold transition-colors"
          >
            <selType.Icon size={16} /> {selType.action} <IoOpenOutline size={16} />
          </a>
        </div>
      </div>
      <p className="text-[13px] text-slate-500 text-center">Tocá un libro para ver el documento.</p>
    </div>
  );
}

function EmptyState({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{message}</p>
    </div>
  );
}
