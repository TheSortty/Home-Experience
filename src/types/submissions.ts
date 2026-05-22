// Shared submission / review / chat types used by both campus and admin.

export type SubmissionStatus = 'pending_review' | 'reviewed' | 'approved';

export interface Submission {
  id: string;
  user_id: string;
  lesson_id: string;
  storage_path: string;
  file_name: string;
  is_late: boolean;
  version: number;
  status: SubmissionStatus;
  approved_by: string | null;
  approved_at: string | null;
  submitted_at: string;
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
  thread: SubmissionThread | null;
}
