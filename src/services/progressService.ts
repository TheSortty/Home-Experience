import { SupabaseClient } from '@supabase/supabase-js';

export interface StudentProgramProgress {
  enrollmentId: string;
  enrollmentStatus: string;
  cycleId: string;
  cycleName: string;
  courseId: string | null;
  courseTitle: string;
  courseCover: string | null;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  nextModuleTitle: string | null;
}

/**
 * Fetches the progress for a specific student across all their active/completed enrollments.
 * If profileId is not provided, it fetches the progress for the currently logged-in user.
 * 
 * @param supabase The Supabase client (browser or server)
 * @param profileId Optional. The ID of the student to fetch progress for.
 * @returns Array of StudentProgramProgress objects
 */
export interface LmsCourseProgress {
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  /** Primera clase sin completar, en orden de módulo y clase. */
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  nextModuleTitle: string | null;
}

/**
 * Progreso de un alumno en cursos del LMS, contado directamente sobre el curso.
 *
 * `get_student_progress` deriva el progreso de enrollment → cycle → course, así
 * que sólo ve los cursos que cuelgan de un ciclo. Los cursos del campus se
 * asignan directo (course_access) y no siempre tienen ciclo, por eso acá
 * contamos las clases publicadas del curso contra lesson_progress.
 *
 * No cuenta los módulos institucionales (son repositorio de documentos, no
 * recorrido), igual que la página del curso.
 */
export async function getLmsCourseProgress(
  supabase: SupabaseClient<any, 'public', any>,
  profileId: string,
  courseIds: string[],
): Promise<Map<string, LmsCourseProgress>> {
  const result = new Map<string, LmsCourseProgress>();
  if (courseIds.length === 0) return result;

  const { data: mods, error } = await supabase
    .from('modules')
    .select('id, title, order_index, course_id, module_type, lessons(id, title, order_index, is_published)')
    .in('course_id', courseIds)
    .eq('is_published', true);

  if (error) {
    console.error('[progressService] getLmsCourseProgress:', error.message);
    return result;
  }

  type FlatLesson = { id: string; title: string; moduleTitle: string };
  const lessonsByCourse = new Map<string, FlatLesson[]>();

  const orderedModules = [...((mods ?? []) as any[])]
    .filter(m => (m.module_type ?? 'module') !== 'institutional')
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  for (const m of orderedModules) {
    const lessons = [...(m.lessons ?? [])]
      .filter((l: any) => l.is_published)
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((l: any) => ({ id: l.id as string, title: l.title as string, moduleTitle: m.title as string }));
    if (lessons.length === 0) continue;
    lessonsByCourse.set(m.course_id, [...(lessonsByCourse.get(m.course_id) ?? []), ...lessons]);
  }

  const allLessonIds = [...lessonsByCourse.values()].flat().map(l => l.id);
  const completed = new Set<string>();
  if (allLessonIds.length > 0) {
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', profileId)
      .in('lesson_id', allLessonIds)
      .eq('completed', true);
    (progress ?? []).forEach((p: any) => completed.add(p.lesson_id));
  }

  for (const courseId of courseIds) {
    const lessons = lessonsByCourse.get(courseId) ?? [];
    const done = lessons.filter(l => completed.has(l.id)).length;
    const next = lessons.find(l => !completed.has(l.id)) ?? null;
    result.set(courseId, {
      totalLessons: lessons.length,
      completedLessons: done,
      progressPercent: lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0,
      nextLessonId: next?.id ?? null,
      nextLessonTitle: next?.title ?? null,
      nextModuleTitle: next?.moduleTitle ?? null,
    });
  }

  return result;
}

export async function getStudentProgress(supabase: SupabaseClient<any, "public", any>, profileId?: string): Promise<StudentProgramProgress[]> {
  try {
    const params = profileId ? { p_profile_id: profileId } : undefined;
    
    const { data, error } = await supabase.rpc('get_student_progress', params);
    
    if (error) {
        console.error('Error in getStudentProgress:', error);
        throw error;
    }
    
    // Map snake_case response to camelCase interface
    return (data || []).map((item: any) => ({
      enrollmentId: item.enrollment_id,
      enrollmentStatus: item.enrollment_status,
      cycleId: item.cycle_id,
      cycleName: item.cycle_name,
      courseId: item.course_id,
      courseTitle: item.course_title,
      courseCover: item.course_cover,
      totalLessons: Number(item.total_lessons),
      completedLessons: Number(item.completed_lessons),
      progressPercent: item.progress_percent,
      nextLessonId: item.next_lesson_id,
      nextLessonTitle: item.next_lesson_title,
      nextModuleTitle: item.next_module_title,
    }));
  } catch (error) {
    console.error('Failed to fetch student progress:', error);
    return [];
  }
}
