'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markLessonComplete(lessonId: string, courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { error: 'Perfil no encontrado' };

  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: profile.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );

  if (error) return { error: error.message };

  revalidatePath(`/cursos/${courseId}`);
  revalidatePath(`/cursos/${courseId}/${lessonId}`);
  revalidatePath('/cursos');
  revalidatePath('/dashboard');

  return { success: true };
}

export async function postLessonComment(
  courseId: string,
  lessonId: string,
  body: string
) {
  if (!body.trim()) return { error: 'El mensaje no puede estar vacío' };
  if (body.length > 2000) return { error: 'El mensaje es demasiado largo (máx 2000 caracteres)' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { error: 'Perfil no encontrado' };

  const { error } = await supabase.from('forum_posts').insert({
    course_id: courseId,
    lesson_id: lessonId,
    user_id: profile.id,
    body: body.trim(),
  });

  if (error) return { error: error.message };

  revalidatePath(`/cursos/${courseId}/${lessonId}`);
  return { success: true };
}
