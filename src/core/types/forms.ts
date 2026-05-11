export interface FormField {
    id: string;
    type: 'text' | 'textarea' | 'select' | 'radio' | 'date' | 'email' | 'tel' | 'checkbox';
    label: string;
    placeholder?: string;
    options?: string[]; // For select/radio
    required: boolean;
    section: 'personal' | 'medical' | 'payment' | 'intro' | 'dreams' | 'extra';
}

export interface FormSubmission {
    id: string;
    submittedAt: string;
    data: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected' | 'enrolled';
}
