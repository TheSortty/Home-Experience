import type { ActivityEventType, ActivityTargetKind } from './activityEvents';

export interface ActivityEventSlim {
  event_type: ActivityEventType;
  target_kind: ActivityTargetKind | null;
  details: Record<string, any>;
}

export function composeHeadline(ev: ActivityEventSlim): { title: string; secondary: string | null } {
  const d = ev.details || {};
  const actor = d.actorName || 'Alguien';

  switch (ev.event_type) {
    case 'content.material_published':
      return {
        title: `${actor} subió un material`,
        secondary: d.materialTitle ? `«${d.materialTitle}»${d.lessonTitle ? ` · ${d.lessonTitle}` : ''}` : null,
      };
    case 'content.lesson_published':
      return {
        title: `${actor} publicó una clase`,
        secondary: d.lessonTitle ? `«${d.lessonTitle}»${d.hasVideo ? ' · con video' : ''}` : null,
      };
    case 'content.session_scheduled':
      return {
        title: `${actor} agendó un encuentro`,
        secondary: `${d.sessionDate ?? ''}${d.sessionTime ? ` · ${String(d.sessionTime).slice(0, 5)}` : ''}${d.cycleName ? ` · ${d.cycleName}` : d.courseTitle ? ` · ${d.courseTitle}` : ''}`.trim() || null,
      };
    case 'content.forum_announcement':
      return {
        title: `${actor} abrió un hilo en el foro`,
        secondary: d.title ? `«${d.title}»` : d.bodyPreview ?? null,
      };
    case 'student.material_accessed':
      return {
        title: `${actor} abrió un material`,
        secondary: d.materialTitle ? `«${d.materialTitle}»${d.lessonTitle ? ` · ${d.lessonTitle}` : ''}` : null,
      };
    case 'student.work_submitted':
      return {
        title: `${actor} entregó una guía trabajada`,
        secondary: `${d.fileName ?? 'archivo'}${d.version ? ` · v${d.version}` : ''}${d.isLate ? ' · entrega tardía' : ''}${d.lessonTitle ? ` · ${d.lessonTitle}` : ''}`,
      };
    case 'student.forum_question':
      return {
        title: `${actor} preguntó en el foro`,
        secondary: d.title ? `«${d.title}»` : d.bodyPreview ?? null,
      };
    case 'coach.material_accessed':
      return {
        title: `${actor} (coach) descargó un material`,
        secondary: d.materialTitle ? `«${d.materialTitle}»${d.lessonTitle ? ` · ${d.lessonTitle}` : ''}` : null,
      };
    case 'coach.work_returned':
      return {
        title: `${actor} devolvió una entrega`,
        secondary: `${d.lessonTitle ?? 'clase'}${d.submissionVersion ? ` · v${d.submissionVersion}` : ''}${d.hasRevisedFile ? ' · con archivo revisado' : ''}${d.hasFeedback ? ' · con feedback' : ''}`,
      };
    case 'coach.work_approved':
      return {
        title: `${actor} aprobó la entrega`,
        secondary: `${d.lessonTitle ?? 'clase'}${d.submissionVersion ? ` · v${d.submissionVersion}` : ''}${d.courseTitle ? ` · ${d.courseTitle}` : ''}`,
      };
    case 'admin.submission_deleted':
      return {
        title: `${actor} eliminó una entrega`,
        secondary: `${d.fileCount ? `${d.fileCount} archivo${Number(d.fileCount) !== 1 ? 's' : ''}` : 'entrega'}${d.version ? ` · v${d.version}` : ''}`,
      };
    default:
      return { title: 'Evento', secondary: null };
  }
}

export function entityLink(ev: ActivityEventSlim): { href: string; label: string } | null {
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
