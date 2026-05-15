'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  IoCheckmarkCircle,
  IoDocumentTextOutline,
  IoTimeOutline,
  IoPlayCircleOutline,
  IoCloudUploadOutline,
} from 'react-icons/io5';
import { markLessonComplete, trackLessonEnter, trackVideoPlay, trackResourceOpen } from '../../actions';
import LessonForum, { type LessonPost } from './LessonForum';
import SubmissionTab, { type SubmissionData } from './SubmissionTab';

export interface LessonResource {
  id: string;
  title: string;
  file_url: string;
  type: string;
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
  initialPosts: LessonPost[];
  currentUserName: string;
  embedUrl: string | null;
  submissionData: SubmissionData;
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
  initialPosts,
  currentUserName,
  embedUrl,
  submissionData,
}: Props) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  // Si la clase no tiene video pero sí materiales, abrimos directamente en "materiales"
  const initialTab: 'resumen' | 'materiales' | 'foro' | 'entrega' =
    !embedUrl && !description && resources.length > 0 ? 'materiales' : 'resumen';
  const [activeTab, setActiveTab] = useState<'resumen' | 'materiales' | 'foro' | 'entrega'>(initialTab);
  const [isPending, startTransition] = useTransition();
  const videoTrackedRef = useRef(false);
  const enterTrackedRef = useRef(false);

  // Track first entry
  useEffect(() => {
    if (enterTrackedRef.current) return;
    enterTrackedRef.current = true;
    trackLessonEnter(lessonId);
  }, [lessonId]);

  // Track first video play via YouTube postMessage API
  useEffect(() => {
    if (!embedUrl) return;

    const handler = (event: MessageEvent) => {
      if (videoTrackedRef.current) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        // YouTube IFrame API fires info={"playerState":1} when playing
        const playerState = data?.info?.playerState ?? data?.info?.currentTime;
        if (data?.event === 'infoDelivery' && data?.info?.playerState === 1) {
          videoTrackedRef.current = true;
          trackVideoPlay(lessonId);
        }
        // Also catch initial "onStateChange" with state=1
        if (data?.event === 'onStateChange' && data?.info === 1) {
          videoTrackedRef.current = true;
          trackVideoPlay(lessonId);
        }
      } catch {}
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [embedUrl, lessonId]);

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
    {
      id: 'materiales' as const,
      label: `Materiales${resources.length > 0 ? ` (${resources.length})` : ''}`,
    },
    { id: 'foro' as const, label: 'Foro' },
    ...(submissionData.requiresSubmission
      ? [{ id: 'entrega' as const, label: submissionData.latestSubmission ? 'Entrega ✓' : 'Entrega' }]
      : []),
  ];

  // YouTube embed URL with JS API enabled for tracking
  const trackableEmbedUrl = embedUrl
    ? `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}enablejsapi=1`
    : null;

  const hasVideo = !!trackableEmbedUrl;

  return (
    <>
      {/* VIDEO PLAYER — solo si la clase tiene video */}
      {hasVideo && (
        <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 aspect-video">
          <iframe
            src={trackableEmbedUrl!}
            title={lessonTitle}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}

      {/* LESSON HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="px-3 py-1 bg-[#00A9CE]/10 text-[#00A9CE] text-xs font-bold uppercase tracking-wider rounded-md">
                {moduleTitle}
              </span>
              {!hasVideo && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                  <IoDocumentTextOutline size={12} /> Clase de lectura
                </span>
              )}
              {durationLabel && hasVideo && (
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
            {isCompleted ? 'Clase Completada' : isPending ? 'Guardando...' : 'Marcar como Terminada'}
          </button>
        </div>
      </div>

      {/* TABS */}
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
              <h3 className="text-lg font-bold text-slate-900 mb-4">Sobre esta clase</h3>
              {description ? (
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {description}
                </div>
              ) : (
                <p className="text-slate-400 italic">El instructor no añadió descripción para esta clase.</p>
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
                <p className="text-slate-400 italic">No hay materiales adjuntos para esta clase.</p>
              ) : (
                <ul className="space-y-3">
                  {resources.map((r) => {
                    const url = r.file_url.toLowerCase();
                    let iconColor = 'bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white';
                    let typeLabel = r.type;

                    if (url.endsWith('.pdf') || r.type === 'pdf') {
                      iconColor = 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white';
                      typeLabel = 'PDF';
                    } else if (url.endsWith('.doc') || url.endsWith('.docx')) {
                      iconColor = 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white';
                      typeLabel = 'Word';
                    } else if (url.endsWith('.xls') || url.endsWith('.xlsx') || url.endsWith('.csv')) {
                      iconColor = 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white';
                      typeLabel = 'Planilla';
                    } else if (url.endsWith('.ppt') || url.endsWith('.pptx')) {
                      iconColor = 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white';
                      typeLabel = 'Presentación';
                    }

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
                            <p className="text-sm font-bold text-slate-900 group-hover:text-[#00A9CE] transition-colors truncate">
                              {r.title}
                            </p>
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
            />
          )}

          {activeTab === 'entrega' && (
            <SubmissionTab
              lessonId={lessonId}
              courseId={courseId}
              data={submissionData}
            />
          )}
        </div>
      </div>
    </>
  );
}
