'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logEventServer } from '@/src/services/activityEvents';
import { isAdminRole, isReviewerRole } from '@/src/services/roleService';
import {
  buildReviewKey, putEntregaObject, deleteEntregaObjects,
  isAllowedFile, MAX_FILE_BYTES, MAX_FILES_PER_SUBMISSION,
} from '@/src/services/entregasStorage';
import type { Database } from '@/src/types/database.types';
import type {
  SubmissionThread, SubmissionStatus, Submission,
  SubmissionReview, ChatMessage, ThreadItem, SubmissionFile, SubmissionReviewFile,
} from '@/src/types/submissions';

// Admin-only operations (lesson lifecycle, etc.)
async function assertStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase
    .from('profiles').select('id, role, first_name, last_name').eq('user_id', user.id).single();
  if (!isAdminRole(profile?.role ?? ''))
    throw new Error('Sin permisos');
  return { supabase, profile: profile! };
}

// Review operations — coaches and admins
async function assertReviewer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase
    .from('profiles').select('id, role, first_name, last_name').eq('user_id', user.id).single();
  if (!isReviewerRole(profile?.role ?? ''))
    throw new Error('Sin permisos');
  return { supabase, profile: profile! };
}

export async function updateLessonLifecycle(formData: FormData) {
  const { supabase } = await assertStaff();

  const lessonId = formData.get('lessonId') as string;
  const courseId = formData.get('courseId') as string;
  const status = formData.get('status') as string;
  const unlockAt = formData.get('unlock_at') as string | null;
  const dueDays = formData.get('due_days') as string | null;
  const requiresSubmission = formData.get('requires_submission') === '1';
  const blockAfterDue = formData.get('block_after_due') === '1';

  type LessonUpdate = Database['public']['Tables']['lessons']['Update'];
  const update: LessonUpdate = {
    status,
    requires_submission: requiresSubmission,
    block_after_due: blockAfterDue,
    unlock_at: unlockAt || null,
    due_days_after_unlock: dueDays ? parseInt(dueDays, 10) : null,
    ...(status === 'unlocked' ? { unlocked_at: new Date().toISOString() } : {}),
  };

  const { error } = await supabase
    .from('lessons')
    .update(update)
    .eq('id', lessonId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/lms/${courseId}`);
  revalidatePath(`/admin/lms/${courseId}/entregas`);
  revalidatePath(`/cursos/${courseId}`);
  return { success: true };
}

export async function submitAdminReview(formData: FormData) {
  const { supabase, profile: reviewer } = await assertReviewer();

  const submissionId = formData.get('submissionId') as string;
  const feedbackText = formData.get('feedback_text') as string | null;
  const courseId = formData.get('courseId') as string;
  const lessonId = formData.get('lessonId') as string;
  const approve = formData.get('approve') === '1';

  // A devolución can carry several files (submission_review_files). Legacy
  // single-file columns stay null for new reviews.
  const files = formData.getAll('revised_files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES_PER_SUBMISSION) {
    return { error: `Máximo ${MAX_FILES_PER_SUBMISSION} archivos por devolución` };
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return { error: `"${f.name}" supera los ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB permitidos` };
    }
    if (!isAllowedFile(f.name)) {
      return { error: `"${f.name}" tiene un formato no permitido (PDF, Word, imágenes, etc.)` };
    }
  }

  // Resolve the owning student + version to build classified R2 keys.
  let subUserId: string | null = null;
  let subVersion = 1;
  if (files.length > 0) {
    const { data: subRow } = await supabase
      .from('submissions')
      .select('user_id, version')
      .eq('id', submissionId)
      .single();
    if (!subRow) return { error: 'Entrega no encontrada' };
    subUserId = subRow.user_id;
    subVersion = subRow.version;
  }

  // Insert the devolución row first so the file rows can reference it.
  const { data: insertedReview, error } = await supabase
    .from('submission_reviews')
    .insert({
      submission_id: submissionId,
      reviewed_by: reviewer.id,
      feedback_text: feedbackText?.trim() || null,
      revised_storage_path: null,
      revised_file_name: null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Upload each revised file to R2 + record it. Roll back the review on failure.
  let revisedFileName: string | null = null;
  if (files.length > 0 && insertedReview?.id) {
    const uploadedKeys: string[] = [];
    try {
      for (const file of files) {
        const key = buildReviewKey({
          courseId, lessonId,
          studentProfileId: subUserId!,
          version: subVersion,
          fileId: crypto.randomUUID(),
          fileName: file.name,
        });
        await putEntregaObject(key, await file.arrayBuffer(), file.type);
        uploadedKeys.push(key);

        const { error: frErr } = await supabase
          .from('submission_review_files')
          .insert({
            review_id: insertedReview.id,
            storage_key: key,
            file_name: file.name,
            content_type: file.type || null,
            size_bytes: file.size,
          });
        if (frErr) throw new Error(frErr.message);
      }
    } catch (err) {
      await deleteEntregaObjects(uploadedKeys);
      await supabase.from('submission_reviews').delete().eq('id', insertedReview.id);
      console.error('[entregas] revised files upload failed:', err);
      return { error: 'No se pudo subir el/los archivo(s) de la devolución. Probá de nuevo.' };
    }
    revisedFileName = files.length === 1 ? files[0].name : `${files.length} archivos`;
  }

  // Update submission status: 'approved' or 'reviewed'
  const newStatus: SubmissionStatus = approve ? 'approved' : 'reviewed';
  type SubUpdate = Database['public']['Tables']['submissions']['Update'];
  const statusUpdate: SubUpdate = {
    status: newStatus,
    ...(approve ? { approved_by: reviewer.id, approved_at: new Date().toISOString() } : {}),
  };
  await supabase
    .from('submissions')
    .update(statusUpdate)
    .eq('id', submissionId);

  // Bandeja event
  const { data: submission } = await supabase
    .from('submissions')
    .select('user_id, lesson_id, version, file_name, lessons(title, modules(title, courses(id, title)))')
    .eq('id', submissionId)
    .single();

  const reviewerName = `${reviewer.first_name ?? ''} ${reviewer.last_name ?? ''}`.trim() || null;

  if (insertedReview?.id && submission) {
    await logEventServer(supabase, {
      type: approve ? 'coach.work_approved' : 'coach.work_returned',
      actorProfileId: reviewer.id,
      actorRole: reviewer.role,
      subjectProfileId: (submission as any).user_id,
      targetKind: 'submission_review',
      targetId: insertedReview.id,
      details: {
        actorName: reviewerName,
        submissionId,
        submissionVersion: (submission as any).version,
        submissionFileName: (submission as any).file_name,
        hasFeedback: !!feedbackText?.trim(),
        hasRevisedFile: !!revisedFileName,
        revisedFileName,
        approved: approve,
        lessonTitle: (submission as any).lessons?.title ?? null,
        moduleTitle: (submission as any).lessons?.modules?.title ?? null,
        courseId: (submission as any).lessons?.modules?.courses?.id ?? null,
        courseTitle: (submission as any).lessons?.modules?.courses?.title ?? null,
      },
    });
  }

  revalidatePath(`/admin/lms/${courseId}/entregas`);
  revalidatePath(`/cursos/${courseId}/${lessonId}`);
  return { success: true, approved: approve };
}

// ── delete a whole delivery (admin / organizador only) ────────────────────────
// Removes every R2 object for the submission (student files + revised files)
// and the DB rows (submission_files / submission_reviews cascade off submissions).

export async function deleteSubmission(submissionId: string, courseId: string) {
  const { supabase, profile: admin } = await assertStaff();

  // Gather all R2 keys tied to this delivery.
  const [{ data: files }, { data: reviews }, { data: sub }] = await Promise.all([
    supabase.from('submission_files').select('storage_key').eq('submission_id', submissionId),
    supabase.from('submission_reviews').select('id, revised_storage_path').eq('submission_id', submissionId),
    supabase.from('submissions').select('user_id, lesson_id, version').eq('id', submissionId).single(),
  ]);

  const reviewIds = (reviews ?? []).map(r => r.id);
  const { data: reviewFiles } = reviewIds.length
    ? await supabase.from('submission_review_files').select('storage_key').in('review_id', reviewIds)
    : { data: [] as { storage_key: string }[] };

  const keys = [
    ...((files ?? []).map(f => f.storage_key)),
    ...((reviews ?? []).map(r => r.revised_storage_path).filter((k): k is string => !!k)),
    ...((reviewFiles ?? []).map(f => f.storage_key)),
  ];

  // Delete DB row first (cascades children). Only proceed to purge R2 if it worked.
  const { error: delErr } = await supabase.from('submissions').delete().eq('id', submissionId);
  if (delErr) return { error: delErr.message };

  await deleteEntregaObjects(keys);

  await logEventServer(supabase, {
    type: 'admin.submission_deleted',
    actorProfileId: admin.id,
    actorRole: admin.role,
    subjectProfileId: (sub as any)?.user_id ?? null,
    targetKind: 'submission',
    targetId: submissionId,
    details: {
      actorName: `${admin.first_name ?? ''} ${admin.last_name ?? ''}`.trim() || null,
      fileCount: keys.length,
      lessonId: (sub as any)?.lesson_id ?? null,
      version: (sub as any)?.version ?? null,
    },
  });

  revalidatePath(`/admin/lms/${courseId}/entregas`);
  return { success: true };
}

// ── reset: wipe a student's whole thread for a lesson (clean slate) ───────────
// Use when a student has a problem with their delivery and needs to start over:
// removes every version, review, chat message and R2 object so they can submit
// from scratch (status goes back to "no entregó").
export async function resetStudentSubmission(
  studentProfileId: string,
  lessonId: string,
  courseId: string,
) {
  const { supabase, profile: admin } = await assertStaff();

  // All submissions this student has for this lesson.
  const { data: subs } = await supabase
    .from('submissions')
    .select('id')
    .eq('user_id', studentProfileId)
    .eq('lesson_id', lessonId);

  const submissionIds = (subs ?? []).map(s => s.id);
  if (submissionIds.length === 0) return { error: 'Este alumno no tiene entregas en esta clase.' };

  // Gather all R2 keys across every version (uploads + revised review files).
  const [{ data: files }, { data: reviews }] = await Promise.all([
    supabase.from('submission_files').select('storage_key').in('submission_id', submissionIds),
    supabase.from('submission_reviews').select('id, revised_storage_path').in('submission_id', submissionIds),
  ]);
  const reviewIds = (reviews ?? []).map(r => r.id);
  const { data: reviewFiles } = reviewIds.length
    ? await supabase.from('submission_review_files').select('storage_key').in('review_id', reviewIds)
    : { data: [] as { storage_key: string }[] };
  const keys = [
    ...((files ?? []).map(f => f.storage_key)),
    ...((reviews ?? []).map(r => r.revised_storage_path).filter((k): k is string => !!k)),
    ...((reviewFiles ?? []).map(f => f.storage_key)),
  ];

  // Delete DB rows first (submissions cascade their files + reviews).
  const { error: delErr } = await supabase.from('submissions').delete().in('id', submissionIds);
  if (delErr) return { error: delErr.message };
  // Chat messages aren't tied to a submission row — clear them by thread.
  await supabase
    .from('submission_chat_messages')
    .delete()
    .eq('lesson_id', lessonId)
    .eq('student_id', studentProfileId);

  await deleteEntregaObjects(keys);

  await logEventServer(supabase, {
    type: 'admin.submission_deleted',
    actorProfileId: admin.id,
    actorRole: admin.role,
    subjectProfileId: studentProfileId,
    targetKind: 'submission',
    targetId: submissionIds[0],
    details: {
      actorName: `${admin.first_name ?? ''} ${admin.last_name ?? ''}`.trim() || null,
      fileCount: keys.length,
      lessonId,
      reset: true,
    },
  });

  revalidatePath(`/admin/lms/${courseId}/entregas`);
  return { success: true };
}

// ── additionals: coach/organizer enables a student to attach extra files ──────
// Flips submissions.allow_additional on the student's latest delivery. While
// true, the student can append "adicional" files to their existing entrega
// (see addSubmissionFiles in the campus actions).
export async function setAdditionalAllowed(
  submissionId: string,
  courseId: string,
  allowed: boolean,
) {
  const { supabase } = await assertReviewer();

  const { error } = await supabase
    .from('submissions')
    .update({ allow_additional: allowed })
    .eq('id', submissionId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/lms/${courseId}/entregas`);
  return { success: true, allowed };
}

// ── chat: coach / admin posts a message ──────────────────────────────────────

export async function postReviewerChatMessage(
  lessonId: string,
  studentProfileId: string,
  body: string,
) {
  const trimmed = body.trim();
  if (!trimmed) return { error: 'El mensaje no puede estar vacío' };
  if (trimmed.length > 2000) return { error: 'Máximo 2000 caracteres' };

  const { supabase, profile: reviewer } = await assertReviewer();

  const { error } = await supabase
    .from('submission_chat_messages')
    .insert({
      lesson_id: lessonId,
      student_id: studentProfileId,
      author_id: reviewer.id,
      body: trimmed,
    });

  if (error) return { error: error.message };
  return { success: true };
}

// ── thread: full submission thread for a student (reviewer view) ─────────────

export async function getReviewerThread(
  lessonId: string,
  studentProfileId: string,
): Promise<SubmissionThread | null> {
  const { supabase } = await assertReviewer();

  const { data: rawSubs } = await supabase
    .from('submissions')
    .select('id, file_name, storage_path, submission_url, is_late, version, status, approved_by, approved_at, submitted_at, allow_additional')
    .eq('user_id', studentProfileId)
    .eq('lesson_id', lessonId)
    .order('version', { ascending: true });

  if (!rawSubs || rawSubs.length === 0) return null;

  const submissionIds = rawSubs.map(s => s.id);

  const [{ data: rawReviews }, { data: rawChat }, { data: rawFiles }] = await Promise.all([
    supabase
      .from('submission_reviews')
      .select('id, submission_id, reviewed_by, feedback_text, revised_storage_path, revised_file_name, reviewed_at, profiles(first_name, last_name)')
      .in('submission_id', submissionIds)
      .order('reviewed_at', { ascending: true }),
    supabase
      .from('submission_chat_messages')
      .select('id, author_id, body, created_at, profiles!author_id(first_name, last_name, role)')
      .eq('lesson_id', lessonId)
      .eq('student_id', studentProfileId)
      .order('created_at', { ascending: true }),
    supabase
      .from('submission_files')
      .select('id, submission_id, storage_key, file_name, content_type, size_bytes, created_at, is_additional, is_late')
      .in('submission_id', submissionIds)
      .order('created_at', { ascending: true }),
  ]);

  const filesBySubmission: Record<string, SubmissionFile[]> = {};
  for (const f of (rawFiles ?? [])) {
    (filesBySubmission[f.submission_id] ??= []).push(f as SubmissionFile);
  }

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

  const submissions: Submission[] = rawSubs.map(s => ({
    ...s,
    user_id: studentProfileId,
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
      student_id: studentProfileId,
      author_id: m.author_id,
      body: m.body,
      created_at: m.created_at,
      author_name: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || null : null,
      author_side: isReviewerRole(role) ? 'reviewer' : 'student',
    };
  });

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

  return {
    status: submissions[submissions.length - 1].status,
    submissions,
    reviewsBySubmission,
    chatMessages,
    timeline,
  };
}
