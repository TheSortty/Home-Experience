'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logEventServer } from '@/src/services/activityEvents';

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

async function getActor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name')
    .eq('user_id', user.id)
    .single();
  if (!profile) return null;
  return {
    profileId: profile.id as string,
    role: (profile.role as string) ?? 'student',
    name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || null,
  };
}

/**
 * Staff (admin/sysadmin/super_admin/coach) browsing the campus must NOT
 * pollute lesson_progress / submissions etc. with their own activity. Every
 * tracking server action short-circuits when this returns true.
 */
async function isStaffActor(): Promise<boolean> {
  const actor = await getActor();
  if (!actor) return false;
  return ['admin', 'sysadmin', 'super_admin', 'coach'].includes(actor.role);
}

// ── mark lesson complete ──────────────────────────────────────────────────────

export async function markLessonComplete(lessonId: string, courseId: string) {
  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return { error: 'No autenticado' };
  // Staff browsing the campus shouldn't generate progress rows for themselves.
  if (await isStaffActor()) return { success: true, skipped: true };

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

  // Log to staff bandeja. Replies (parent_id != null) are not announced —
  // only first-level questions surface in the admin feed.
  if (!options?.parentId) {
    const actor = await getActor();
    if (actor) {
      const isStaffOrCoach = ['admin', 'sysadmin', 'super_admin', 'coach'].includes(actor.role);
      await logEventServer(supabase, {
        type: isStaffOrCoach ? 'content.forum_announcement' : 'student.forum_question',
        actorProfileId: actor.profileId,
        actorRole: actor.role,
        subjectProfileId: isStaffOrCoach ? null : actor.profileId,
        targetKind: 'forum_post',
        targetId: data.id,
        details: {
          actorName: actor.name,
          courseId,
          lessonId,
          title: options?.title?.trim() || null,
          bodyPreview: body.trim().slice(0, 160),
        },
      });
    }
  }

  revalidatePath(`/cursos/${courseId}/${lessonId}`);
  revalidatePath('/comunidad');
  return { success: true, id: data.id, created_at: data.created_at };
}

// ── tracking: lesson entered ──────────────────────────────────────────────────

export async function trackLessonEnter(lessonId: string) {
  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return;
  if (await isStaffActor()) return;

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
  if (await isStaffActor()) return;

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
  const actor = await getActor();
  if (!actor) return;

  await supabase
    .from('resource_opens')
    .upsert(
      { user_id: actor.profileId, lesson_resource_id: resourceId, opened_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_resource_id', ignoreDuplicates: true }
    );

  // Pull material title for the bandeja card. Best-effort — failure here
  // shouldn't block the open.
  const { data: resource } = await supabase
    .from('lesson_resources')
    .select('title, type, lesson_id, lessons(title, modules(title, courses(id, title)))')
    .eq('id', resourceId)
    .maybeSingle();

  const isStaff = ['admin', 'sysadmin', 'super_admin'].includes(actor.role);
  const isCoach = actor.role === 'coach';

  // Staff openings are not part of the bandeja — they're the ones who uploaded
  // the materials in the first place, so logging their accesses would be noise.
  if (isStaff) return;

  await logEventServer(supabase, {
    type: isCoach ? 'coach.material_accessed' : 'student.material_accessed',
    actorProfileId: actor.profileId,
    actorRole: actor.role,
    subjectProfileId: actor.profileId,
    targetKind: 'lesson_resource',
    targetId: resourceId,
    details: {
      actorName: actor.name,
      materialTitle: (resource as any)?.title ?? null,
      materialType: (resource as any)?.type ?? null,
      lessonTitle: (resource as any)?.lessons?.title ?? null,
      moduleTitle: (resource as any)?.lessons?.modules?.title ?? null,
      courseId: (resource as any)?.lessons?.modules?.courses?.id ?? null,
      courseTitle: (resource as any)?.lessons?.modules?.courses?.title ?? null,
    },
  });
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

  const { data: inserted, error: dbError } = await supabase
    .from('submissions')
    .insert({
      user_id: profile.id,
      lesson_id: lessonId,
      storage_path: storagePath,
      file_name: file.name,
      is_late: isLate,
      version: nextVersion,
    })
    .select('id')
    .single();

  if (dbError) {
    await supabase.storage.from('submissions').remove([storagePath]);
    return { error: dbError.message };
  }

  // Bandeja event: student submitted work. Pull lesson context for the card.
  const { data: lessonInfo } = await supabase
    .from('lessons')
    .select('title, modules(title, courses(id, title))')
    .eq('id', lessonId)
    .maybeSingle();
  const actor = await getActor();
  if (actor && inserted?.id) {
    await logEventServer(supabase, {
      type: 'student.work_submitted',
      actorProfileId: actor.profileId,
      actorRole: actor.role,
      subjectProfileId: actor.profileId,
      targetKind: 'submission',
      targetId: inserted.id,
      details: {
        actorName: actor.name,
        fileName: file.name,
        version: nextVersion,
        isLate,
        lessonId,
        lessonTitle: (lessonInfo as any)?.title ?? null,
        moduleTitle: (lessonInfo as any)?.modules?.title ?? null,
        courseId: (lessonInfo as any)?.modules?.courses?.id ?? null,
        courseTitle: (lessonInfo as any)?.modules?.courses?.title ?? null,
      },
    });
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
