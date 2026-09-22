// Shared submission / review / chat types used by both campus and admin.

export type SubmissionStatus = 'pending_review' | 'reviewed' | 'approved';

/** One file attached to a submission, stored in Cloudflare R2. */
export interface SubmissionFile {
  id: string;
  submission_id: string;
  storage_key: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
  /** Attached after the delivery was made (coach-enabled "adicional"). */
  is_additional: boolean;
  /** Landed after the lesson deadline. */
  is_late: boolean;
}

export interface Submission {
  id: string;
  user_id: string;
  lesson_id: string;
  storage_path: string | null;
  file_name: string | null;
  submission_url?: string | null;
  is_late: boolean;
  version: number;
  status: SubmissionStatus;
  approved_by: string | null;
  approved_at: string | null;
  submitted_at: string;
  /** Coach/organizer enabled the student to attach extra "adicional" files. */
  allow_additional?: boolean;
  /** Attached files (multi-file deliveries). Empty for legacy link/single rows. */
  files?: SubmissionFile[];
}

/** One file attached to a devolución (coach → student), stored in R2. */
export interface SubmissionReviewFile {
  id: string;
  review_id: string;
  storage_key: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface SubmissionReview {
  id: string;
  submission_id: string;
  reviewed_by: string;
  feedback_text: string | null;
  revised_storage_path: string | null;
  revised_file_name: string | null;
  reviewed_at: string;
  /** joined from profiles */
  reviewer_name?: string | null;
  /** Multi-file devolución (new model). Legacy single file uses revised_* above. */
  files?: SubmissionReviewFile[];
}

export interface ChatMessage {
  id: string;
  lesson_id: string;
  student_id: string;
  author_id: string;
  body: string;
  created_at: string;
  /** joined from profiles */
  author_name?: string | null;
  /** derived: 'student' | 'coach' */
  author_side?: 'student' | 'reviewer';
}

/** A single chronological item in the unified thread view. */
export type ThreadItem =
  | { kind: 'submission'; data: Submission }
  | { kind: 'review';     data: SubmissionReview }
  | { kind: 'chat';       data: ChatMessage };

/** Full thread state for a student+lesson pair. */
export interface SubmissionThread {
  /** Latest status across all submissions. */
  status: SubmissionStatus;
  /** All submissions ordered by version ASC. */
  submissions: Submission[];
  /** All reviews keyed by submission_id. */
  reviewsBySubmission: Record<string, SubmissionReview[]>;
  /** Chat messages ordered by created_at ASC. */
  chatMessages: ChatMessage[];
  /** Unified timeline, sorted by date. */
  timeline: ThreadItem[];
}

/** What the campus lesson page passes to SubmissionTab. */
export interface SubmissionTabData {
  requiresSubmission: boolean;
  dueDate: string | null;
  isOverdue: boolean;
  daysRemaining: number | null;
  /** Hard deadline reached: lesson blocks new submissions past the due date. */
  submissionsClosed: boolean;
  thread: SubmissionThread | null;
}
