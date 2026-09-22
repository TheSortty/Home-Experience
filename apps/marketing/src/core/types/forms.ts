export interface FormField {
    id: string;
    type: 'text' | 'textarea' | 'select' | 'radio' | 'date' | 'email' | 'tel' | 'checkbox';
    label: string;
    placeholder?: string;
    // For select/radio. Stored as string[] in DB, but the admin editor keeps a
    // transient CSV string during typing — both forms must be accepted.
    options?: string | string[];
    required: boolean;
    section: 'personal' | 'medical' | 'payment' | 'intro' | 'dreams' | 'extra';
}

export interface FormSubmission {
    id: string;
    submittedAt: string;
    data: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected' | 'enrolled';
}
