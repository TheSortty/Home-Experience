// ─── Fecha límite de entrega de una clase ────────────────────────────────────
// Una única fuente de verdad para "cuándo vence la entrega":
//
//   1. `due_at` — fecha y hora EXACTA cargada por el admin (prioridad).
//   2. Fallback legado: N días de plazo contados desde la fecha de desbloqueo
//      CONFIGURADA (`unlock_at`). Solo si no hay unlock_at configurado se usa
//      `unlocked_at` (el momento en que el admin ejecutó el desbloqueo) — antes
//      se usaba siempre unlocked_at y la hora límite quedaba atada a la hora en
//      que el admin hacía el clic.

export type LessonDeadlineFields = {
  due_at?: string | null;
  unlock_at?: string | null;
  unlocked_at?: string | null;
  due_days_after_unlock?: number | null;
};

const DAY_MS = 86400000;

/** Epoch ms del vencimiento, o null si la clase no tiene fecha límite. */
export function lessonDueMs(lesson: LessonDeadlineFields): number | null {
  if (lesson.due_at) return new Date(lesson.due_at).getTime();
  const base = lesson.unlock_at ?? lesson.unlocked_at;
  if (base && lesson.due_days_after_unlock) {
    return new Date(base).getTime() + lesson.due_days_after_unlock * DAY_MS;
  }
  return null;
}

export function isLessonPastDue(lesson: LessonDeadlineFields, nowMs = Date.now()): boolean {
  const due = lessonDueMs(lesson);
  return due !== null && nowMs > due;
}
