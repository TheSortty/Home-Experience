/**
 * Activity Events — single entry point for the staff/coach bandeja.
 *
 * Every "noteworthy" action (admin publishes content, student opens a guide,
 * coach returns a submission, etc.) goes through `logEvent`. Inserts are
 * fire-and-forget: a failure to log NEVER blocks the user-visible action.
 *
 * The RLS policy `self_insert` on staff_activity_events enforces that
 * actor_profile_id = caller's profile, so we don't need elevated privileges.
 *
 * Used from both client components and server actions (the import surface
 * stays the same; the supabase client is passed in for server callers).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { restInsert, restSelect, getCurrentUserId } from './supabaseRest';

export type ActivityEventType =
  | 'content.material_published'
  | 'content.lesson_published'
  | 'content.session_scheduled'
  | 'content.forum_announcement'
  | 'student.material_accessed'
  | 'student.work_submitted'
  | 'student.forum_question'
  | 'coach.material_accessed'
  | 'coach.work_returned'
  | 'coach.work_approved'
  | 'admin.submission_deleted';

export type ActivityTargetKind =
  | 'lesson_resource'
  | 'lesson'
  | 'course_session'
  | 'cycle_session'
  | 'submission'
  | 'submission_review'
  | 'forum_post';

export interface LogEventArgs {
  type: ActivityEventType;
  actorProfileId: string;
  actorRole?: string | null;
  /** The student the event is "about". Null for platform-wide events. */
  subjectProfileId?: string | null;
  targetKind?: ActivityTargetKind;
  targetId?: string | null;
  /** Free-form context used by the UI to render without joins. */
  details?: Record<string, unknown>;
}

/**
 * Browser-side logger. Uses the REST helper so we don't get caught by the
 * Supabase JS hang in admin sessions.
 */
export async function logEvent(args: LogEventArgs): Promise<void> {
  try {
    await restInsert(
      'staff_activity_events',
      {
        event_type: args.type,
        actor_profile_id: args.actorProfileId,
        actor_role: args.actorRole ?? null,
        subject_profile_id: args.subjectProfileId ?? null,
        target_kind: args.targetKind ?? null,
        target_id: args.targetId ?? null,
        details: args.details ?? {},
      },
      { returning: 'minimal' }
    );
  } catch (err) {
    // Logging is never load-bearing: never throw, never block the user flow.
    console.warn('[activityEvents] Failed to log event', args.type, err);
  }
}

/**
 * Server-side logger (server actions, route handlers). Pass the server
 * supabase client so the insert runs with the user's session.
 */
export async function logEventServer(
  supabase: SupabaseClient<any, 'public', any>,
  args: LogEventArgs,
): Promise<void> {
  try {
    const { error } = await supabase.from('staff_activity_events').insert({
      event_type: args.type,
      actor_profile_id: args.actorProfileId,
      actor_role: args.actorRole ?? null,
      subject_profile_id: args.subjectProfileId ?? null,
      target_kind: args.targetKind ?? null,
      target_id: args.targetId ?? null,
      details: args.details ?? {},
    });
    if (error) console.warn('[activityEvents] insert error:', error.message);
  } catch (err) {
    console.warn('[activityEvents] Failed to log event', args.type, err);
  }
}

/**
 * Convenience: read the auth user id from cookie (no network) without calling
 * the JS client. Useful when a hook needs the actor id but doesn't have the
 * auth context handy. Returns null if no session.
 */
export function getActorUserIdFromCookie(): string | null {
  return getCurrentUserId();
}

export interface ActorInfo {
  profileId: string;
  role: string;
  name: string | null;
}

// Module-level cache so we hit the DB at most once per page load. Keyed by
// the auth user id to handle account switching in the same tab.
let cachedActor: { userId: string; actor: ActorInfo } | null = null;

/**
 * Resolve the actor's profile id + role from the browser. Lightweight cache
 * means subsequent calls are free. Always uses REST so it can't deadlock on
 * the JS client.
 */
export async function getMyActorInfo(): Promise<ActorInfo | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  if (cachedActor && cachedActor.userId === userId) return cachedActor.actor;

  try {
    const { data } = await restSelect<{
      id: string;
      role: string | null;
      first_name: string | null;
      last_name: string | null;
    }>('profiles', {
      columns: 'id,role,first_name,last_name',
      filters: { user_id: `eq.${userId}` },
      limit: 1,
    });
    const row = data[0];
    if (!row) return null;
    const actor: ActorInfo = {
      profileId: row.id,
      role: row.role ?? 'student',
      name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || null,
    };
    cachedActor = { userId, actor };
    return actor;
  } catch (err) {
    console.warn('[activityEvents] Failed to resolve actor info', err);
    return null;
  }
}
