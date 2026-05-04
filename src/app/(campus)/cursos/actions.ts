'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ── helpers ──────────────────────────────────────────────────────────────────

async function getProfileId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  return profile?.id ?? null;
}

// ── mark lesson complete ──────────────────────────────────────────────────────

export async function markLessonComplete(lessonId: string, courseId: string) {
  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return { error: 'No autenticado' };

  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      { user_id: profileId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );

  if (error) return { error: error.message };

  revalidatePath(`/cursos/${courseId}`);
  revalidatePath(`/cursos/${courseId}/${lessonId}`);
  revalidatePath('/cursos');
  revalidatePath('/dashboard');
  return { success: true };
}

// ── forum post ────────────────────────────────────────────────────────────────

export async function postLessonComment(
  courseId: string,
  lessonId: string,
  body: string,
  options?: { title?: string | null; parentId?: string | null }
) {
  if (!body.trim()) return { error: 'El mensaje no puede estar vacío' };
  if (body.length > 2000) return { error: 'El mensaje es demasiado largo (máx 2000 caracteres)' };

  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return { error: 'No autenticado' };

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      course_id: courseId,
      lesson_id: lessonId,
      user_id: profileId,
      title: options?.title?.trim() || null,
      body: body.trim(),
      parent_id: options?.parentId ?? null,
    })
    .select('id, created_at')
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/cursos/${courseId}/${lessonId}`);
  revalidatePath('/comunidad');
  return { success: true, id: data.id, created_at: data.created_at };
}

// ── tracking: lesson entered ──────────────────────────────────────────────────

export async function trackLessonEnter(lessonId: string) {
  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return;

  const { data: existing } = await supabase
    .from('lesson_progress')
    .select('id, entered_at')
    .eq('user_id', profileId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('lesson_progress').insert({
      user_id: profileId,
      lesson_id: lessonId,
      entered_at: new Date().toISOString(),
    });
  } else if (!existing.entered_at) {
    await supabase.from('lesson_progress').update({
      entered_at: new Date().toISOString(),
    }).eq('id', existing.id);
  }
}

// ── tracking: video first play ────────────────────────────────────────────────

export async function trackVideoPlay(lessonId: string) {
  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return;

  const { data: existing } = await supabase
    .from('lesson_progress')
    .select('id, video_played_at')
    .eq('user_id', profileId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('lesson_progress').insert({
      user_id: profileId,
      lesson_id: lessonId,
      video_played_at: new Date().toISOString(),
    });
  } else if (!existing.video_played_at) {
    await supabase.from('lesson_progress').update({
      video_played_at: new Date().toISOString(),
    }).eq('id', existing.id);
  }
}

// ── tracking: resource opened ─────────────────────────────────────────────────

export async function trackResourceOpen(resourceId: string) {
  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return;

  await supabase
    .from('resource_opens')
    .upsert(
      { user_id: profileId, lesson_resource_id: resourceId, opened_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_resource_id', ignoreDuplicates: true }
    );
}

// ── submission: upload file ───────────────────────────────────────────────────

export async function submitLesson(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return { error: 'Perfil no encontrado' };

  const lessonId = formData.get('lessonId') as string;
  const courseId = formData.get('courseId') as string;
  const file = formData.get('file') as File;

  if (!lessonId || !file || file.size === 0) return { error: 'Archivo requerido' };
  if (file.size > 52428800) return { error: 'El archivo supera el límite de 50 MB' };

  const { data: lesson } = await supabase
    .from('lessons')
    .select('status, unlocked_at, due_days_after_unlock')
    .eq('id', lessonId)
    .single();

  if (!lesson || lesson.status !== 'unlocked') return { error: 'Esta clase no acepta entregas en este momento' };

  const isLate = !!(
    lesson.unlocked_at &&
    lesson.due_days_after_unlock &&
    Date.now() > new Date(lesson.unlocked_at).getTime() + lesson.due_days_after_unlock * 86400000
  );

  const { data: prevVersions } = await supabase
    .from('submissions')
    .select('version')
    .eq('user_id', profile.id)
    .eq('lesson_id', lessonId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = (prevVersions?.[0]?.version ?? 0) + 1;
  const ext = file.name.split('.').pop() ?? 'bin';
  const storagePath = `${profile.id}/${lessonId}/v${nextVersion}_${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('submissions')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return { error: uploadError.message };

  const { error: dbError } = await supabase.from('submissions').insert({
    user_id: profile.id,
    lesson_id: lessonId,
    storage_path: storagePath,
    file_name: file.name,
    is_late: isLate,
    version: nextVersion,
  });

  if (dbError) {
    await supabase.storage.from('submissions').remove([storagePath]);
    return { error: dbError.message };
  }

  revalidatePath(`/cursos/${courseId}/${lessonId}`);
  return { success: true, version: nextVersion };
}

// ── submission: get signed download URL ──────────────────────────────────────

export async function getSubmissionDownloadUrl(submissionId: string) {
  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return { error: 'No autenticado' };

  const { data: sub } = await supabase
    .from('submissions')
    .select('storage_path, user_id')
    .eq('id', submissionId)
    .single();

  if (!sub) return { error: 'Entrega no encontrada' };
  if (sub.user_id !== profileId && !(await isStaff(supabase))) return { error: 'Sin acceso' };

  const { data } = await supabase.storage
    .from('submissions')
    .createSignedUrl(sub.storage_path, 300);

  return data ? { url: data.signedUrl } : { error: 'No se pudo generar el enlace' };
}

async function isStaff(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  return ['admin', 'sysadmin', 'super_admin'].includes(data?.role ?? '');
}
