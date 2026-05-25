'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  IoCheckmarkCircle,
  IoDocumentTextOutline,
  IoTimeOutline,
  IoPlayCircleOutline,
  IoCloudUploadOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
} from 'react-icons/io5';
import { markLessonComplete, trackLessonEnter, trackVideoPlay, trackResourceOpen } from '../../actions';
import { isReviewerRole } from '@/src/services/roleService';
import LessonForum, { type LessonPost } from './LessonForum';
import SubmissionTab from './SubmissionTab';
import type { SubmissionTabData } from '@/src/types/submissions';

export interface LessonResource {
  id: string;
  title: string;
  file_url: string;
  type: string | null;
}

export interface LessonVideo {
  id: string;
  title: string | null;
  video_url: string;
  duration_seconds: number;
  order_index: number;
}

interface Props {
  lessonId: string;
  courseId: string;
  lessonTitle: string;
  lessonIndex: number;
  moduleTitle: string;
  durationLabel: string;
  description: string | null;
  initialCompleted: boolean;
  resources: LessonResource[];
  videos: LessonVideo[];
  initialPosts: LessonPost[];
  currentUserName: string;
  currentUserRole?: string | null;
  studentProfileId?: string | null;
  submissionData: SubmissionTabData;
}

function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return null;
  return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
}

function fmtDuration(seconds: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function LessonViewer({
  lessonId,
  courseId,
  lessonTitle,
  lessonIndex,
  moduleTitle,
  durationLabel,
  description,
  initialCompleted,
  resources,
  videos,
  initialPosts,
  currentUserName,
  currentUserRole,
  studentProfileId,
  submissionData,
}: Props) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);

  const hasVideos = videos.length > 0;
  const isMulti = videos.length > 1;
  const activeVideo = videos[activeVideoIdx] ?? null;

  const initialTab: 'resumen' | 'materiales' | 'foro' | 'entrega' =
    !hasVideos && !description && resources.length > 0 ? 'materiales' : 'resumen';
  const [activeTab, setActiveTab] = useState<'resumen' | 'materiales' | 'foro' | 'entrega'>(initialTab);
  const [isPending, startTransition] = useTransition();

  const trackedVideosRef = useRef<Set<number>>(new Set());
  const enterTrackedRef = useRef(false);
  const isStaff = !!(currentUserRole && isReviewerRole(currentUserRole));

  // Track first entry
  useEffect(() => {
    if (isStaff || enterTrackedRef.current) return;
    enterTrackedRef.current = true;
    trackLessonEnter(lessonId);
  }, [lessonId, isStaff]);

  // Track first play of each video via YouTube postMessage
  useEffect(() => {
    if (!activeVideo || isStaff) return;
    const idx = activeVideoIdx;

    const handler = (event: MessageEvent) => {
      if (trackedVideosRef.current.has(idx)) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (
          (data?.event === 'infoDelivery' && data?.info?.playerState === 1) ||
          (data?.event === 'onStateChange' && data?.info === 1)
        ) {
          trackedVideosRef.current.add(idx);
          trackVideoPlay(lessonId);
        }
      } catch {}
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [activeVideoIdx, activeVideo, lessonId, isStaff]);

  const handleMarkComplete = () => {
    if (isCompleted || isPending) return;
    setIsCompleted(true);
    startTransition(async () => {
      const result = await markLessonComplete(lessonId, courseId);
      if (result.error) setIsCompleted(false);
    });
  };

  const trackAndOpen = (resourceId: string, url: string) => {
    trackResourceOpen(resourceId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const tabs = [
    { id: 'resumen' as const, label: 'Resumen' },
    { id: 'materiales' as const, label: `Materiales${resources.length > 0 ? ` (${resources.length})` : ''}` },
    { id: 'foro' as const, label: 'Foro' },
    ...(submissionData.requiresSubmission
      ? [{ id: 'entrega' as const, label: submissionData.thread?.status === 'approved' ? 'Entrega ✓' : 'Entrega' }]
      : []),
  ];

  const activeEmbedUrl = activeVideo ? getYoutubeEmbedUrl(activeVideo.video_url) : null;
  const trackableEmbedUrl = activeEmbedUrl
    ? `${activeEmbedUrl}${activeEmbedUrl.includes('?') ? '&' : '?'}enablejsapi=1`
    : null;

  return (
    <>
      {/* ── VIDEO PLAYER ─────────────────────────────────────────────────────── */}
      {hasVideos && (
        <div className="space-y-0">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 aspect-video">
            {trackableEmbedUrl ? (
              <iframe
                key={activeVideoIdx}
                src={trackableEmbedUrl}
                title={activeVideo?.title ?? lessonTitle}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center gap-3">
                <IoPlayCircleOutline size={48} className="text-white/30" />
                <p className="text-white/50 text-sm font-medium">URL de video no reconocida</p>
              </div>
            )}
          </div>

          {/* Carousel nav — only when 2+ videos */}
          {isMulti && (
            <div className="bg-slate-900 rounded-b-2xl -mt-px px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setActiveVideoIdx(i => Math.max(0, i - 1))}
                disabled={activeVideoIdx === 0}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                aria-label="Video anterior"
              >
                <IoChevronBackOutline size={18} />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-1.5 shrink-0">
                {videos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveVideoIdx(i)}
                    className={`rounded-full transition-all ${
                      i === activeVideoIdx
                        ? 'w-4 h-2 bg-[#00A9CE]'
                        : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Video ${i + 1}`}
                  />
                ))}
              </div>

              {/* Title + duration */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-white/40 text-xs font-bold shrink-0">
                  {activeVideoIdx + 1}/{videos.length}
                </span>
                {activeVideo?.title && (
                  <span className="text-white/80 text-sm font-medium truncate">
                    {activeVideo.title}
                  </span>
                )}
                {activeVideo?.duration_seconds > 0 && (
                  <span className="text-white/40 text-xs shrink-0">
                    · {fmtDuration(activeVideo.duration_seconds)}
                  </span>
                )}
              </div>

              <button
                onClick={() => setActiveVideoIdx(i => Math.min(videos.length - 1, i + 1))}
                disabled={activeVideoIdx === videos.length - 1}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                aria-label="Siguiente video"
              >
                <IoChevronForwardOutline size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── LESSON HEADER CARD ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="px-3 py-1 bg-[#00A9CE]/10 text-[#00A9CE] text-xs font-bold uppercase tracking-wider rounded-md">
                {moduleTitle}
              </span>
              {!hasVideos && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                  <IoDocumentTextOutline size={12} /> Tema de lectura
                </span>
              )}
              {isMulti && (
                <span className="px-3 py-1 bg-[#00A9CE]/10 text-[#00A9CE] text-xs font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                  <IoPlayCircleOutline size={12} /> {videos.length} videos
                </span>
              )}
              {durationLabel && hasVideos && (
                <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                  <IoTimeOutline /> {durationLabel}
                </span>
              )}
              {submissionData.requiresSubmission && (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                  <IoCloudUploadOutline size={12} /> Requiere entrega
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {lessonIndex}. {lessonTitle}
            </h1>
          </div>

          {isStaff ? (
            <span className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
              <IoCheckmarkCircle size={16} className="opacity-40" />
              Vista organizador — sin seguimiento
            </span>
          ) : (
            <button
              onClick={handleMarkComplete}
              disabled={isPending}
              className={`shrink-0 px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default'
                  : isPending
                  ? 'bg-slate-100 text-slate-400 cursor-wait'
                  : 'bg-[#00A9CE] text-white hover:bg-blue-600 hover:shadow-md cursor-pointer'
              }`}
            >
              <IoCheckmarkCircle size={20} />
              {isCompleted ? 'Tema Completado' : isPending ? 'Guardando...' : 'Marcar como Terminado'}
            </button>
          )}
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-fit py-4 px-3 text-center font-bold text-sm transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'text-[#00A9CE] border-b-2 border-[#00A9CE] bg-slate-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8 min-h-[280px]">
          {activeTab === 'resumen' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Sobre este tema</h3>
              {description ? (
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {description}
                </div>
              ) : (
                <p className="text-slate-400 italic">El instructor no añadió descripción para este tema.</p>
              )}
            </div>
          )}

          {activeTab === 'materiales' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <IoDocumentTextOutline className="text-[#00A9CE] text-xl" />
                Material Descargable
              </h3>
              {resources.length === 0 ? (
                <p className="text-slate-400 italic">No hay materiales adjuntos para este tema.</p>
              ) : (
                <ul className="space-y-3">
                  {resources.map((r) => {
                    const url = r.file_url.toLowerCase();
                    let iconColor = 'bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white';
                    let typeLabel = r.type;
                    if (url.endsWith('.pdf') || r.type === 'pdf') { iconColor = 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white'; typeLabel = 'PDF'; }
                    else if (url.endsWith('.doc') || url.endsWith('.docx')) { iconColor = 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'; typeLabel = 'Word'; }
                    else if (url.endsWith('.xls') || url.endsWith('.xlsx') || url.endsWith('.csv')) { iconColor = 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'; typeLabel = 'Planilla'; }
                    else if (url.endsWith('.ppt') || url.endsWith('.pptx')) { iconColor = 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'; typeLabel = 'Presentación'; }
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => trackAndOpen(r.id, r.file_url)}
                          className="w-full flex items-center gap-4 group p-4 border border-slate-200 rounded-xl hover:border-[#00A9CE] hover:shadow-sm transition-all bg-white text-left"
                        >
                          <div className={`p-3 rounded-lg transition-colors shrink-0 ${iconColor}`}>
                            <IoDocumentTextOutline size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-[#00A9CE] transition-colors truncate">{r.title}</p>
                            <p className="text-xs text-slate-500 capitalize">{typeLabel}</p>
                          </div>
                          <span className="text-xs font-bold text-[#00A9CE] bg-[#00A9CE]/10 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block shrink-0">
                            Abrir
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'foro' && (
            <LessonForum
              courseId={courseId}
              lessonId={lessonId}
              initialPosts={initialPosts}
              currentUserName={currentUserName}
              currentUserRole={currentUserRole}
            />
          )}

          {activeTab === 'entrega' && (
            <SubmissionTab
              lessonId={lessonId}
              courseId={courseId}
              data={submissionData}
              studentProfileId={studentProfileId}
            />
          )}
        </div>
      </div>
    </>
  );
}
