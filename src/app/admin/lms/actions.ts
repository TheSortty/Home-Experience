'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

async function assertStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (!['admin', 'sysadmin', 'super_admin'].includes(profile?.role ?? ''))
    throw new Error('Sin permisos');
  return supabase;
}

export async function updateLessonLifecycle(formData: FormData) {
  const supabase = await assertStaff();

  const lessonId = formData.get('lessonId') as string;
  const courseId = formData.get('courseId') as string;
  const status = formData.get('status') as string;
  const unlockAt = formData.get('unlock_at') as string | null;
  const dueDays = formData.get('due_days') as string | null;
  const requiresSubmission = formData.get('requires_submission') === '1';

  const update: Record<string, unknown> = {
    status,
    requires_submission: requiresSubmission,
    unlock_at: unlockAt || null,
    due_days_after_unlock: dueDays ? parseInt(dueDays, 10) : null,
  };

  if (status === 'unlocked') {
    update.unlocked_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('lessons')
    .update(update)
    .eq('id', lessonId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/lms/${courseId}`);
  revalidatePath(`/cursos/${courseId}`);
  return { success: true };
}

export async function submitAdminReview(formData: FormData) {
  const supabase = await assertStaff();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: reviewer } = await supabase
    .from('profiles').select('id').eq('user_id', user!.id).single();
  if (!reviewer) return { error: 'Perfil no encontrado' };

  const submissionId = formData.get('submissionId') as string;
  const feedbackText = formData.get('feedback_text') as string | null;
  const courseId = formData.get('courseId') as string;
  const lessonId = formData.get('lessonId') as string;
  const file = formData.get('revised_file') as File | null;

  let revisedStoragePath: string | null = null;
  let revisedFileName: string | null = null;

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `reviews/${submissionId}/${Date.now()}.${ext}`;
    const ab = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(path, ab, { contentType: file.type, upsert: false });
    if (uploadError) return { error: uploadError.message };
    revisedStoragePath = path;
    revisedFileName = file.name;
  }

  const { error } = await supabase.from('submission_reviews').insert({
    submission_id: submissionId,
    reviewed_by: reviewer.id,
    feedback_text: feedbackText?.trim() || null,
    revised_storage_path: revisedStoragePath,
    revised_file_name: revisedFileName,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/lms/${courseId}/entregas`);
  revalidatePath(`/cursos/${courseId}/${lessonId}`);
  return { success: true };
}

export async function getAdminSignedUrl(storagePath: string) {
  const supabase = await assertStaff();
  const { data } = await supabase.storage
    .from('submissions')
    .createSignedUrl(storagePath, 300);
  return data ? { url: data.signedUrl } : { error: 'No se pudo generar el enlace' };
}
