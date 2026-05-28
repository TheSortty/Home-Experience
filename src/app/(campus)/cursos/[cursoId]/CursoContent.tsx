'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IoCheckmarkCircle,
  IoPlayCircleOutline,
  IoDocumentTextOutline,
  IoEllipseOutline,
  IoEyeOutline,
  IoFolderOpenOutline,
  IoSchoolOutline,
  IoFlashOutline,
  IoMusicalNotesOutline,
  IoLinkOutline,
  IoArrowForwardOutline,
} from 'react-icons/io5';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LessonNode = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number;
  order_index: number;
};

export type ModuleNode = {
  id: string;
  title: string;
  order_index: number;
  module_type: string;
  lessons: LessonNode[];
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
  resources: ResourceWithContext[];
  completedLessonIds: string[];
  nextLessonId: string | null;
  isOrganizer: boolean;
}

type TabId = 'modulos' | 'talleres' | 'archivos';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const TYPE_VISUAL: Record<
  string,
  { bg: string; bgHover: string; ring: string; text: string; chip: string; Icon: typeof IoDocumentTextOutline; label: string }
> = {
  pdf:   { bg: 'bg-rose-50',    bgHover: 'group-hover:bg-rose-100',    ring: 'ring-rose-100',    text: 'text-rose-500',    chip: 'bg-rose-50 text-rose-600 border-rose-100',     Icon: IoDocumentTextOutline,  label: 'PDF'   },
  audio: { bg: 'bg-violet-50',  bgHover: 'group-hover:bg-violet-100',  ring: 'ring-violet-100',  text: 'text-violet-500',  chip: 'bg-violet-50 text-violet-600 border-violet-100', Icon: IoMusicalNotesOutline,  label: 'Audio' },
  link:  { bg: 'bg-sky-50',     bgHover: 'group-hover:bg-sky-100',     ring: 'ring-sky-100',     text: 'text-sky-500',     chip: 'bg-sky-50 text-sky-600 border-sky-100',         Icon: IoLinkOutline,          label: 'Link'  },
};

function resolveType(r: ResourceWithContext) {
  const explicit = r.type?.toLowerCase();
  if (explicit && TYPE_VISUAL[explicit]) return TYPE_VISUAL[explicit];
  const url = r.file_url.toLowerCase();
  if (/\.(pdf)(\?|$)/.test(url)) return TYPE_VISUAL.pdf;
  if (/\.(mp3|wav|m4a|ogg)(\?|$)/.test(url)) return TYPE_VISUAL.audio;
  return TYPE_VISUAL.link;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CursoContent({
  cursoId,
  modules,
  workshopModules,
  resources,
  completedLessonIds,
  nextLessonId,
  isOrganizer,
}: Props) {
  const completedSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0)
                     + workshopModules.reduce((s, m) => s + m.lessons.length, 0);
  const completedCount = completedSet.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Group resources by module (preserving creation order inside)
  const resourcesByModule = useMemo(() => {
    const map = new Map<string, { moduleId: string; moduleTitle: string; moduleOrder: number; items: ResourceWithContext[] }>();
    for (const r of resources) {
      if (!map.has(r.moduleId)) {
        map.set(r.moduleId, { moduleId: r.moduleId, moduleTitle: r.moduleTitle, moduleOrder: r.moduleOrder, items: [] });
      }
      map.get(r.moduleId)!.items.push(r);
    }
    return Array.from(map.values()).sort((a, b) => a.moduleOrder - b.moduleOrder);
  }, [resources]);

  const counts = {
    modulos: modules.length,
    talleres: workshopModules.length,
    archivos: resources.length,
  };

  const tabs: { id: TabId; label: string; Icon: typeof IoSchoolOutline; count: number; accent: string }[] = [
    { id: 'modulos',  label: 'Módulos',                Icon: IoSchoolOutline,      count: counts.modulos,  accent: '#00A9CE' },
    { id: 'talleres', label: 'Talleres',               Icon: IoFlashOutline,       count: counts.talleres, accent: '#F59E0B' },
    { id: 'archivos', label: 'Archivos institucionales', Icon: IoFolderOpenOutline, count: counts.archivos, accent: '#10B981' },
  ];

  const [tab, setTab] = useState<TabId>('modulos');

  return (
    <div className="space-y-6">
      {/* ── Tab pills + count summary ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm gap-1 flex-wrap">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
                style={isActive ? { backgroundColor: t.accent, boxShadow: `0 4px 14px -2px ${t.accent}55` } : {}}
              >
                <t.Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(' ')[0]}</span>
                {t.count > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid: tab content + progress sidebar ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
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
            <TalleresTab
              cursoId={cursoId}
              workshopModules={workshopModules}
              completedSet={completedSet}
              nextLessonId={nextLessonId}
              isOrganizer={isOrganizer}
            />
          )}
          {tab === 'archivos' && <ArchivosTab grouped={resourcesByModule} totalCount={resources.length} />}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {isOrganizer ? (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
              <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                <IoEyeOutline size={16} /> Vista organizador
              </h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                Estás explorando este programa como organizador. El progreso de los alumnos no se modifica.
              </p>
              <a
                href={`/admin/lms/actividad?course=${cursoId}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:underline"
              >
                Ver actividad de alumnos →
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">Tu Progreso</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Temas completados</span>
                  <span className="font-bold">{completedCount}/{totalLessons}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-right text-xs text-slate-400 font-medium">{progressPercent}% completado</p>
              </div>
            </div>
          )}

          {/* Mini-stats card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4 text-sm">Contenidos disponibles</h3>
            <div className="space-y-3">
              <MiniStat icon={<IoSchoolOutline className="w-4 h-4" />} label="Módulos" value={counts.modulos} color="text-[#00A9CE]" bg="bg-[#00A9CE]/10" onClick={() => setTab('modulos')} />
              <MiniStat icon={<IoFlashOutline className="w-4 h-4" />} label="Talleres" value={counts.talleres} color="text-amber-600" bg="bg-amber-100" onClick={() => setTab('talleres')} />
              <MiniStat icon={<IoFolderOpenOutline className="w-4 h-4" />} label="Archivos" value={counts.archivos} color="text-emerald-600" bg="bg-emerald-100" onClick={() => setTab('archivos')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

function MiniStat({
  icon, label, value, color, bg, onClick,
}: {
  icon: React.ReactNode; label: string; value: number; color: string; bg: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg} ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <span className={`text-lg font-black tabular-nums ${color}`}>{value}</span>
    </button>
  );
}

function ModulosTab({
  cursoId, modules, completedSet, nextLessonId, isOrganizer,
}: {
  cursoId: string;
  modules: ModuleNode[];
  completedSet: Set<string>;
  nextLessonId: string | null;
  isOrganizer: boolean;
}) {
  if (modules.length === 0) {
    return <EmptyState icon={<IoSchoolOutline size={36} />} title="Contenido en preparación" message="Los módulos de este programa estarán disponibles pronto." />;
  }

  return (
    <div className="space-y-4">
      {modules.map((mod, modIdx) => {
        const modCompleted = mod.lessons.filter((l) => completedSet.has(l.id)).length;
        const modTotal = mod.lessons.length;
        const isCurrentModule = !isOrganizer
          && modCompleted < modTotal
          && (modIdx === 0 || modules[modIdx - 1].lessons.every((l) => completedSet.has(l.id)));

        return (
          <div
            key={mod.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
              isCurrentModule ? 'border-l-4 border-l-[#00A9CE] border-slate-200' : 'border-slate-200'
            }`}
          >
            <div className={`p-5 border-b flex justify-between items-center ${
              isCurrentModule ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                  isCurrentModule ? 'text-[#00A9CE]' : 'text-slate-500'
                }`}>
                  Módulo {mod.order_index}
                  {isCurrentModule && ' (Actual)'}
                </p>
                <h3 className="text-lg font-bold text-slate-900">{mod.title}</h3>
              </div>
              {isOrganizer ? (
                <div className="text-xs font-bold text-amber-600">{modTotal} temas</div>
              ) : modCompleted === modTotal && modTotal > 0 ? (
                <div className="text-emerald-500 font-bold text-sm flex items-center gap-1">
                  <IoCheckmarkCircle size={20} /> {modTotal}/{modTotal}
                </div>
              ) : (
                <div className={`font-bold text-sm ${isCurrentModule ? 'text-[#00A9CE]' : 'text-slate-500'}`}>
                  {modCompleted}/{modTotal}
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {mod.lessons.map((lesson) => {
                const isDone = !isOrganizer && completedSet.has(lesson.id);
                const isNext = !isOrganizer && lesson.id === nextLessonId;
                return (
                  <Link
                    key={lesson.id}
                    href={`/cursos/${cursoId}/${lesson.id}`}
                    className={`flex items-center justify-between p-4 transition-colors group ${
                      isNext ? 'bg-[#00A9CE]/5 hover:bg-[#00A9CE]/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {isDone ? (
                        <IoCheckmarkCircle size={24} className="text-emerald-500 shrink-0" />
                      ) : isNext ? (
                        <div className="w-6 h-6 rounded-full border-2 border-[#00A9CE] flex items-center justify-center shrink-0">
                          <div className="w-2 h-2 bg-[#00A9CE] rounded-full" />
                        </div>
                      ) : (
                        <IoEllipseOutline size={24} className={isOrganizer ? 'text-slate-400 shrink-0' : 'text-slate-300 shrink-0'} />
                      )}
                      <div>
                        <p className={`text-sm font-bold transition-colors ${
                          isNext ? 'text-[#00A9CE]' : isDone ? 'text-slate-700 group-hover:text-[#00A9CE]' : 'text-slate-900 group-hover:text-[#00A9CE]'
                        }`}>
                          {lesson.order_index}. {lesson.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          {lesson.video_url ? (
                            <>
                              <IoPlayCircleOutline className="inline" />
                              Video{lesson.duration_seconds > 0 && ` · ${formatDuration(lesson.duration_seconds)}`}
                            </>
                          ) : (
                            <>
                              <IoDocumentTextOutline className="inline" /> Lectura
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {isNext && (
                      <span className="text-xs font-bold bg-white text-[#00A9CE] px-2 py-1 rounded shadow-sm border border-[#00A9CE]/20 shrink-0">
                        Continuar
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TalleresTab({
  cursoId, workshopModules, completedSet, nextLessonId, isOrganizer,
}: {
  cursoId: string;
  workshopModules: ModuleNode[];
  completedSet: Set<string>;
  nextLessonId: string | null;
  isOrganizer: boolean;
}) {
  if (workshopModules.length === 0) {
    return <EmptyState icon={<IoFlashOutline size={36} />} title="Sin talleres todavía" message="Cuando se publiquen talleres complementarios al programa, los vas a ver aquí." />;
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 -mb-1">Módulos prácticos que complementan el programa.</p>
      {workshopModules.map((mod) => {
        const modCompleted = !isOrganizer ? mod.lessons.filter((l) => completedSet.has(l.id)).length : 0;
        const modTotal = mod.lessons.length;
        const allDone = !isOrganizer && modCompleted === modTotal && modTotal > 0;
        return (
          <div key={mod.id} className="bg-white rounded-2xl border border-l-4 border-amber-200 border-l-amber-400 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-amber-100 bg-amber-50/40 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1 text-amber-600">🎯 Taller</p>
                <h3 className="text-lg font-bold text-slate-900">{mod.title}</h3>
              </div>
              {isOrganizer ? (
                <div className="text-xs font-bold text-amber-600">{modTotal} temas</div>
              ) : allDone ? (
                <div className="text-emerald-500 font-bold text-sm flex items-center gap-1">
                  <IoCheckmarkCircle size={20} /> {modTotal}/{modTotal}
                </div>
              ) : (
                <div className="font-bold text-sm text-amber-600">{modCompleted}/{modTotal}</div>
              )}
            </div>
            <div className="divide-y divide-amber-50">
              {mod.lessons.map((lesson) => {
                const isDone = !isOrganizer && completedSet.has(lesson.id);
                const isNext = !isOrganizer && lesson.id === nextLessonId;
                return (
                  <Link
                    key={lesson.id}
                    href={`/cursos/${cursoId}/${lesson.id}`}
                    className={`flex items-center justify-between p-4 transition-colors group ${
                      isNext ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {isDone ? (
                        <IoCheckmarkCircle size={24} className="text-emerald-500 shrink-0" />
                      ) : isNext ? (
                        <div className="w-6 h-6 rounded-full border-2 border-amber-400 flex items-center justify-center shrink-0">
                          <div className="w-2 h-2 bg-amber-400 rounded-full" />
                        </div>
                      ) : (
                        <IoEllipseOutline size={24} className="text-amber-200 shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm font-bold transition-colors ${
                          isNext ? 'text-amber-600' : isDone ? 'text-slate-700 group-hover:text-amber-600' : 'text-slate-900 group-hover:text-amber-600'
                        }`}>
                          {lesson.order_index}. {lesson.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          {lesson.video_url ? (
                            <><IoPlayCircleOutline className="inline" /> Video{lesson.duration_seconds > 0 && ` · ${formatDuration(lesson.duration_seconds)}`}</>
                          ) : (
                            <><IoDocumentTextOutline className="inline" /> Lectura</>
                          )}
                        </p>
                      </div>
                    </div>
                    {isNext && (
                      <span className="text-xs font-bold bg-white text-amber-600 px-2 py-1 rounded shadow-sm border border-amber-200 shrink-0">
                        Continuar
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ArchivosTab({
  grouped, totalCount,
}: {
  grouped: { moduleId: string; moduleTitle: string; moduleOrder: number; items: ResourceWithContext[] }[];
  totalCount: number;
}) {
  if (totalCount === 0) {
    return (
      <EmptyState
        icon={<IoFolderOpenOutline size={36} />}
        title="No hay archivos todavía"
        message="Cuando se suban PDFs, audios o enlaces de material, los vas a ver acá ordenados por módulo."
      />
    );
  }
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-emerald-50 via-white to-white border border-emerald-100 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-1">Biblioteca del programa</p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Todos los materiales, organizados por módulo y en el orden en que fueron publicados.
        </p>
      </div>

      {grouped.map((group) => {
        const titleHasModuloPrefix = /^m[oó]dulo\b/i.test(group.moduleTitle.trim());
        return (
        <section key={group.moduleId} className="space-y-3">
          <header className="flex items-baseline justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              {!titleHasModuloPrefix && (
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Módulo {group.moduleOrder}
                </p>
              )}
              <h3 className="text-base font-bold text-slate-900">{group.moduleTitle}</h3>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {group.items.length} {group.items.length === 1 ? 'archivo' : 'archivos'}
            </span>
          </header>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.items.map((r, i) => {
              const visual = resolveType(r);
              return (
                <li key={r.id}>
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ring-1 ${visual.bg} ${visual.bgHover} ${visual.ring}`}>
                      <visual.Icon className={`w-6 h-6 ${visual.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${visual.chip}`}>
                          {visual.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          #{String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {r.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Tema {r.lessonOrder}: {r.lessonTitle}
                      </p>
                    </div>
                    <IoArrowForwardOutline className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
        );
      })}
    </div>
  );
}

function EmptyState({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{message}</p>
    </div>
  );
}
