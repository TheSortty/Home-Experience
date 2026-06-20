'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logEventServer } from '@/src/services/activityEvents';
import { isAdminRole, isReviewerRole } from '@/src/services/roleService';
import {
  buildSubmissionKey, putEntregaObject, deleteEntregaObjects,
  isAllowedFile, MAX_FILE_BYTES, MAX_FILES_PER_SUBMISSION,
} from '@/src/services/entregasStorage';
import type {
  SubmissionThread, SubmissionStatus, Submission,
  SubmissionReview, ChatMessage, ThreadItem, SubmissionFile, SubmissionReviewFile,
} from '@/src/types/submissions';

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
  return isReviewerRole(actor.role);
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
      const isStaffOrCoach = isReviewerRole(actor.role);
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

  const isStaff = isAdminRole(actor.role);
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

// ── submission: upload one or more files → Cloudflare R2 ──────────────────────

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
  if (!lessonId || !courseId) return { error: 'Faltan datos de la clase' };

  // Collect attached files (one delivery, many files).
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: 'Adjuntá al menos un archivo' };
  if (files.length > MAX_FILES_PER_SUBMISSION) {
    return { error: `Máximo ${MAX_FILES_PER_SUBMISSION} archivos por entrega` };
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return { error: `"${f.name}" supera los ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB permitidos` };
    }
    if (!isAllowedFile(f.name)) {
      return { error: `"${f.name}" tiene un formato no permitido (PDF, Word, imágenes, etc.)` };
    }
  }

  const { data: lesson } = await supabase
    .from('lessons')
    .select('status, unlocked_at, due_days_after_unlock, block_after_due')
    .eq('id', lessonId)
    .single();

  if (!lesson || lesson.status !== 'unlocked') return { error: 'Esta clase no acepta entregas en este momento' };

  const pastDue = !!(
    lesson.unlocked_at &&
    lesson.due_days_after_unlock &&
    Date.now() > new Date(lesson.unlocked_at).getTime() + lesson.due_days_after_unlock * 86400000
  );
  if (pastDue && lesson.block_after_due) {
    return { error: 'El plazo de entrega de esta clase venció y ya no acepta entregas.' };
  }

  // ── Strict-round check ────────────────────────────────────────────────────────
  const { data: latestSub } = await supabase
    .from('submissions')
    .select('status, version')
    .eq('user_id', profile.id)
    .eq('lesson_id', lessonId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSub?.status === 'pending_review') {
    return { error: 'Tu entrega está esperando devolución. Podrás enviar una nueva versión cuando tu coach te responda.' };
  }
  if (latestSub?.status === 'approved') {
    return { error: '¡Esta entrega ya fue aprobada! El hilo está cerrado.' };
  }

  const isLate = pastDue;

  const nextVersion = (latestSub?.version ?? 0) + 1;

  // ── 1. Create the delivery envelope row ────────────────────────────────────────
  const summaryName = files.length === 1 ? files[0].name : `${files.length} archivos`;
  const { data: inserted, error: dbError } = await supabase
    .from('submissions')
    .insert({
      user_id: profile.id,
      lesson_id: lessonId,
      file_name: summaryName,
      is_late: isLate,
      version: nextVersion,
    })
    .select('id')
    .single();

  if (dbError || !inserted) return { error: dbError?.message ?? 'No se pudo crear la entrega' };

  // ── 2. Upload each file to R2 + record it ──────────────────────────────────────
  const uploadedKeys: string[] = [];
  try {
    for (const file of files) {
      const fileId = crypto.randomUUID();
      const key = buildSubmissionKey({
        courseId, lessonId, studentProfileId: profile.id,
        version: nextVersion, fileId, fileName: file.name,
      });
      await putEntregaObject(key, await file.arrayBuffer(), file.type);
      uploadedKeys.push(key);

      const { error: fileErr } = await supabase
        .from('submission_files')
        .insert({
          submission_id: inserted.id,
          storage_key: key,
          file_name: file.name,
          content_type: file.type || null,
          size_bytes: file.size,
        });
      if (fileErr) throw new Error(fileErr.message);
    }
  } catch (err) {
    // Roll back: remove uploaded objects and the envelope row.
    await deleteEntregaObjects(uploadedKeys);
    await supabase.from('submissions').delete().eq('id', inserted.id);
    console.error('[entregas] upload failed:', err);
    return { error: 'No se pudo subir la entrega. Probá de nuevo en unos segundos.' };
  }

  const { data: lessonInfo } = await supabase
    .from('lessons')
    .select('title, modules(title, courses(id, title))')
    .eq('id', lessonId)
    .maybeSingle();
  const actor = await getActor();
  if (actor) {
    await logEventServer(supabase, {
      type: 'student.work_submitted',
      actorProfileId: actor.profileId,
      actorRole: actor.role,
      subjectProfileId: actor.profileId,
      targetKind: 'submission',
      targetId: inserted.id,
      details: {
        actorName: actor.name,
        fileCount: files.length,
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

// ── submission: add extra "adicional" files to an already-made delivery ───────
// Gated: the latest submission must have allow_additional = true (the coach or
// organizer enables it). Files are appended to the existing delivery (no new
// version) and each one records whether it landed before or after the deadline.
export async function addSubmissionFiles(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return { error: 'Perfil no encontrado' };

  const lessonId = formData.get('lessonId') as string;
  const courseId = formData.get('courseId') as string;
  if (!lessonId || !courseId) return { error: 'Faltan datos de la clase' };

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: 'Adjuntá al menos un archivo' };
  if (files.length > MAX_FILES_PER_SUBMISSION) {
    return { error: `Máximo ${MAX_FILES_PER_SUBMISSION} archivos por vez` };
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return { error: `"${f.name}" supera los ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB permitidos` };
    }
    if (!isAllowedFile(f.name)) {
      return { error: `"${f.name}" tiene un formato no permitido (PDF, Word, imágenes, etc.)` };
    }
  }

  // Latest delivery + the permission gate.
  const { data: latestSub } = await supabase
    .from('submissions')
    .select('id, version, allow_additional')
    .eq('user_id', profile.id)
    .eq('lesson_id', lessonId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestSub) return { error: 'Todavía no hiciste una entrega en esta clase.' };
  if (!latestSub.allow_additional) {
    return { error: 'Tu coach todavía no habilitó agregar archivos adicionales.' };
  }

  // On time or late? — now vs the lesson deadline.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('unlocked_at, due_days_after_unlock')
    .eq('id', lessonId)
    .single();
  const isLate = !!(
    lesson?.unlocked_at &&
    lesson?.due_days_after_unlock &&
    Date.now() > new Date(lesson.unlocked_at).getTime() + lesson.due_days_after_unlock * 86400000
  );

  const uploadedKeys: string[] = [];
  try {
    for (const file of files) {
      const fileId = crypto.randomUUID();
      const key = buildSubmissionKey({
        courseId, lessonId, studentProfileId: profile.id,
        version: latestSub.version, fileId, fileName: file.name,
      });
      await putEntregaObject(key, await file.arrayBuffer(), file.type);
      uploadedKeys.push(key);

      const baseRow = {
        submission_id: latestSub.id,
        storage_key: key,
        file_name: file.name,
        content_type: file.type || null,
        size_bytes: file.size,
      };
      let { error: fileErr } = await supabase
        .from('submission_files')
        .insert({ ...baseRow, is_additional: true, is_late: isLate });

      // If the new columns aren't recognised yet (stale PostgREST schema cache /
      // migration not fully applied), save the file anyway so the upload never
      // hard-fails — the "adicional" badge just won't show until the cache
      // catches up.
      if (fileErr && /is_additional|is_late|schema cache|column|PGRST204/i.test(fileErr.message)) {
        console.warn('[entregas] additional flags not in cache, inserting without them:', fileErr.message);
        ({ error: fileErr } = await supabase.from('submission_files').insert(baseRow));
      }
      if (fileErr) throw new Error(fileErr.message);
    }
  } catch (err) {
    await deleteEntregaObjects(uploadedKeys);
    console.error('[entregas] additional upload failed:', err);
    const detail = err instanceof Error ? err.message : 'error desconocido';
    return { error: `No se pudieron subir los adicionales: ${detail}` };
  }

  // One round per "habilitación": consume the gate so the coach re-enables for
  // the next batch.
  await supabase.from('submissions').update({ allow_additional: false }).eq('id', latestSub.id);

  const actor = await getActor();
  if (actor) {
    await logEventServer(supabase, {
      type: 'student.work_submitted',
      actorProfileId: actor.profileId,
      actorRole: actor.role,
      subjectProfileId: actor.profileId,
      targetKind: 'submission',
      targetId: latestSub.id,
      details: {
        actorName: actor.name,
        fileCount: files.length,
        version: latestSub.version,
        isLate,
        additional: true,
        lessonId,
      },
    });
  }

  revalidatePath(`/cursos/${courseId}/${lessonId}`);
  revalidatePath(`/admin/lms/${courseId}/entregas`);
  return { success: true, isLate };
}

// Delivery files are downloaded through the authenticated streaming route
// /api/entregas/download?key=<r2-key> (see app/api/entregas/download/route.ts).
// No signed-URL server action is needed — the route authorizes via RLS.

// ── submission: get full thread for current student ──────────────────────────

export async function getStudentThread(lessonId: string): Promise<SubmissionThread | null> {
  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return null;

  // All versions this student has submitted for this lesson
  const { data: rawSubs } = await supabase
    .from('submissions')
    .select('id, file_name, storage_path, submission_url, is_late, version, status, approved_by, approved_at, submitted_at, allow_additional')
    .eq('user_id', profileId)
    .eq('lesson_id', lessonId)
    .order('version', { ascending: true });

  if (!rawSubs || rawSubs.length === 0) return null;

  const submissionIds = rawSubs.map(s => s.id);

  // Files attached to those submissions (multi-file deliveries)
  const { data: rawFiles } = await supabase
    .from('submission_files')
    .select('id, submission_id, storage_key, file_name, content_type, size_bytes, created_at, is_additional, is_late')
    .in('submission_id', submissionIds)
    .order('created_at', { ascending: true });

  // All reviews on those submissions
  const { data: rawReviews } = await supabase
    .from('submission_reviews')
    .select('id, submission_id, reviewed_by, feedback_text, revised_storage_path, revised_file_name, reviewed_at, profiles(first_name, last_name)')
    .in('submission_id', submissionIds)
    .order('reviewed_at', { ascending: true });

  // Multi-file devolución attachments, keyed by review.
  const reviewIds = (rawReviews ?? []).map(r => r.id);
  const { data: rawReviewFiles } = reviewIds.length
    ? await supabase
        .from('submission_review_files')
        .select('id, review_id, storage_key, file_name, content_type, size_bytes, created_at')
        .in('review_id', reviewIds)
        .order('created_at', { ascending: true })
    : { data: [] as SubmissionReviewFile[] };
  const reviewFilesByReview: Record<string, SubmissionReviewFile[]> = {};
  for (const f of (rawReviewFiles ?? [])) {
    (reviewFilesByReview[f.review_id] ??= []).push(f as SubmissionReviewFile);
  }

  // Chat messages for this thread
  const { data: rawChat } = await supabase
    .from('submission_chat_messages')
    .select('id, author_id, body, created_at, profiles!author_id(first_name, last_name, role)')
    .eq('lesson_id', lessonId)
    .eq('student_id', profileId)
    .order('created_at', { ascending: true });

  // ── Map raw rows to typed shapes ─────────────────────────────────────────
  const filesBySubmission: Record<string, SubmissionFile[]> = {};
  for (const f of (rawFiles ?? [])) {
    (filesBySubmission[f.submission_id] ??= []).push(f as SubmissionFile);
  }

  const submissions: Submission[] = rawSubs.map(s => ({
    ...s,
    user_id: profileId,
    lesson_id: lessonId,
    status: s.status as SubmissionStatus,
    files: filesBySubmission[s.id] ?? [],
  }));

  const reviewsBySubmission: Record<string, SubmissionReview[]> = {};
  for (const r of (rawReviews ?? [])) {
    const p = (r as any).profiles;
    const mapped: SubmissionReview = {
      id: r.id,
      submission_id: r.submission_id,
      reviewed_by: r.reviewed_by,
      feedback_text: r.feedback_text,
      revised_storage_path: r.revised_storage_path,
      revised_file_name: r.revised_file_name,
      reviewed_at: r.reviewed_at,
      reviewer_name: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || null : null,
      files: reviewFilesByReview[r.id] ?? [],
    };
    if (!reviewsBySubmission[r.submission_id]) reviewsBySubmission[r.submission_id] = [];
    reviewsBySubmission[r.submission_id].push(mapped);
  }

  const chatMessages: ChatMessage[] = (rawChat ?? []).map((m: any) => {
    const p = m.profiles;
    const role: string = p?.role ?? 'student';
    return {
      id: m.id,
      lesson_id: lessonId,
      student_id: profileId,
      author_id: m.author_id,
      body: m.body,
      created_at: m.created_at,
      author_name: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || null : null,
      author_side: isReviewerRole(role) ? 'reviewer' : 'student',
    };
  });

  // ── Unified sorted timeline ───────────────────────────────────────────────
  const timeline: ThreadItem[] = [];
  for (const sub of submissions) {
    timeline.push({ kind: 'submission', data: sub });
    for (const rev of (reviewsBySubmission[sub.id] ?? [])) {
      timeline.push({ kind: 'review', data: rev });
    }
  }
  for (const msg of chatMessages) {
    timeline.push({ kind: 'chat', data: msg });
  }
  timeline.sort((a, b) => {
    const d = (item: ThreadItem) =>
      item.kind === 'submission' ? item.data.submitted_at
      : item.kind === 'review'   ? item.data.reviewed_at
      :                            item.data.created_at;
    return new Date(d(a)).getTime() - new Date(d(b)).getTime();
  });

  const latestStatus = submissions[submissions.length - 1].status;

  return { status: latestStatus, submissions, reviewsBySubmission, chatMessages, timeline };
}

// ── chat: student posts a message ────────────────────────────────────────────

export async function postStudentChatMessage(lessonId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return { error: 'El mensaje no puede estar vacío' };
  if (trimmed.length > 2000) return { error: 'Máximo 2000 caracteres' };

  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return { error: 'No autenticado' };

  const { error } = await supabase
    .from('submission_chat_messages')
    .insert({
      lesson_id: lessonId,
      student_id: profileId,
      author_id: profileId,
      body: trimmed,
    });

  if (error) return { error: error.message };
  return { success: true };
}
