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
        title: `${actor} cerró la entrega con devolución final`,
        secondary: `${d.lessonTitle ?? 'clase'}${d.submissionVersion ? ` · v${d.submissionVersion}` : ''}${d.courseTitle ? ` · ${d.courseTitle}` : ''}`,
      };
    case 'admin.submission_deleted':
      return {
        title: `${actor} eliminó una entrega`,
        secondary: `${d.fileCount ? `${d.fileCount} archivo${Number(d.fileCount) !== 1 ? 's' : ''}` : 'entrega'}${d.version ? ` · v${d.version}` : ''}`,
      };
    case 'payment.approved': {
      // Sin actorName: el evento lo genera el webhook, no una persona.
      const who = d.payerName || d.payerEmail || 'Alguien';
      const amount = typeof d.amount === 'number'
        ? `$${d.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
        : null;
      const cuotas = Number(d.installments) > 1 ? `${d.installments} cuotas` : null;
      return {
        title: `${who} pagó${amount ? ` ${amount}` : ''} por Mercado Pago`,
        secondary: [PAYMENT_ITEM_LABEL[d.itemCode as string] ?? null, cuotas]
          .filter(Boolean).join(' · ') || null,
      };
    }
    default:
      return { title: 'Evento', secondary: null };
  }
}

/** Espeja PAYMENT_ITEMS de pricing.ts, en versión corta para la bandeja. */
const PAYMENT_ITEM_LABEL: Record<string, string> = {
  initial:    'Nivel INICIAL',
  advanced:   'Nivel AVANZADO',
  leadership: 'Programa de Liderazgo',
  combo_1:    'Combo INICIAL + AVANZADO',
  combo_2:    'Combo completo',
};

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
    case 'payment':
      return { href: '/admin/inscripciones', label: 'Ver inscripciones' };
    default:
      return null;
  }
}
