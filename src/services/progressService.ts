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
