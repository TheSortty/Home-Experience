// Categoría de ciclo: CRESER (presencial inscripciones) vs Campus (cursos LMS / otros).
// Lo derivamos del cycle.type — la única fuente de verdad accesible client-side.

export const CRESER_CYCLE_TYPES = ['initial', 'advanced', 'plan_lider'] as const;
export type CresertCycleType = typeof CRESER_CYCLE_TYPES[number];

export type ProgramCategory = 'creser' | 'campus';

export function categorizeCycle(cycleType: string | null | undefined): ProgramCategory {
  if (cycleType && (CRESER_CYCLE_TYPES as readonly string[]).includes(cycleType)) return 'creser';
  return 'campus';
}

export const CYCLE_TYPE_LABELS: Record<string, string> = {
  initial: 'Inicial',
  advanced: 'Avanzado',
  plan_lider: 'Plan Líder',
  workshop: 'Taller',
  coaching: 'Coaching',
};

export function cycleTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Programa';
  return CYCLE_TYPE_LABELS[type] || type;
}

export interface ProgramChipData {
  enrollmentId: string;
  cycleId: string | null;
  cycleName: string;
  cycleType: string;
  category: ProgramCategory;
  status: 'ACTIVE' | 'CONFLICT' | 'GRADUATED';
  courseId: string | null;
  courseTitle: string | null;
}

export interface PersonaStudent {
  id: string;
  user_id: string | null;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  programs: ProgramChipData[];
  programHistory: any[]; // legacy shape for StudentDetailModal
  formData: any;
  medicalInfo: any | null;
  is_deleted: boolean;
}

export interface PersonaCoach {
  id: string;
  user_id: string | null;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  assignedStudentCount: number;
}
