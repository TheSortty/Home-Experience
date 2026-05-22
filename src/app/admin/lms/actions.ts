'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logEventServer } from '@/src/services/activityEvents';
import { isAdminRole, isReviewerRole } from '@/src/services/roleService';
import type { Database } from '@/src/types/database.types';
import type {
  SubmissionThread, SubmissionStatus, Submission,
  SubmissionReview, ChatMessage, ThreadItem,
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

  type LessonUpdate = Database['public']['Tables']['lessons']['Update'];
  const update: LessonUpdate = {
    status,
    requires_submission: requiresSubmission,
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

  const { data: insertedReview, error } = await supabase
    .from('submission_reviews')
    .insert({
      submission_id: submissionId,
      reviewed_by: reviewer.id,
      feedback_text: feedbackText?.trim() || null,
      revised_storage_path: revisedStoragePath,
      revised_file_name: revisedFileName,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

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

// ── signed URLs ───────────────────────────────────────────────────────────────

export async function getAdminSignedUrl(storagePath: string) {
  const { supabase } = await assertReviewer();
  const { data } = await supabase.storage
    .from('submissions')
    .createSignedUrl(storagePath, 300);
  return data ? { url: data.signedUrl } : { error: 'No se pudo generar el enlace' };
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
    .select('id, file_name, storage_path, is_late, version, status, approved_by, approved_at, submitted_at')
    .eq('user_id', studentProfileId)
    .eq('lesson_id', lessonId)
    .order('version', { ascending: true });

  if (!rawSubs || rawSubs.length === 0) return null;

  const submissionIds = rawSubs.map(s => s.id);

  const [{ data: rawReviews }, { data: rawChat }] = await Promise.all([
    supabase
      .from('submission_reviews')
      .select('id, submission_id, reviewed_by, feedback_text, revised_storage_path, revised_file_name, reviewed_at, profiles(first_name, last_name)')
      .in('submission_id', submissionIds)
      .order('reviewed_at', { ascending: true }),
    supabase
      .from('submission_chat_messages')
      .select('id, author_id, body, created_at, profiles(first_name, last_name, role)')
      .eq('lesson_id', lessonId)
      .eq('student_id', studentProfileId)
      .order('created_at', { ascending: true }),
  ]);

  const submissions: Submission[] = rawSubs.map(s => ({
    ...s,
    user_id: studentProfileId,
    lesson_id: lessonId,
    status: s.status as SubmissionStatus,
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
