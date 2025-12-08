import { v4 as uuidv4 } from 'uuid';
import { Testimonial } from '../core/types';
import { TESTIMONIALS } from '../core/constants';

// Types
export interface FormField {
    id: string;
    type: 'text' | 'textarea' | 'select' | 'radio' | 'date' | 'email' | 'tel';
    label: string;
    placeholder?: string;
    options?: string[]; // For select/radio
    required: boolean;
    section: 'personal' | 'medical' | 'payment' | 'intro';
}

export interface FormSubmission {
    id: string;
    submittedAt: string;
    data: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected';
}

// Initial Default Fields
const DEFAULT_FIELDS: FormField[] = [
    { id: 'firstName', type: 'text', label: 'Nombre', required: true, section: 'personal' },
    { id: 'lastName', type: 'text', label: 'Apellido', required: true, section: 'personal' },
    { id: 'email', type: 'email', label: 'Email', required: true, section: 'personal' },
    { id: 'phone', type: 'tel', label: 'Teléfono (WhatsApp)', placeholder: '+54 9...', required: true, section: 'personal' },
    { id: 'birthDate', type: 'date', label: 'Fecha de Nacimiento', required: true, section: 'personal' },
    { id: 'city', type: 'text', label: 'Ciudad / País', required: true, section: 'personal' },
    { id: 'referredBy', type: 'text', label: 'Referido por (Opcional)', required: false, section: 'personal' },

    { id: 'underTreatment', type: 'radio', label: '¿Estás bajo tratamiento médico o psicológico actualmente?', options: ['Sí', 'No'], required: true, section: 'medical' },
    { id: 'treatmentDetails', type: 'textarea', label: 'Detalles del tratamiento', required: false, section: 'medical' },
    { id: 'medication', type: 'textarea', label: '¿Tomas alguna medicación? (Detallar cuál y dosis)', required: false, section: 'medical' },
    { id: 'allergies', type: 'textarea', label: 'Alergias o condiciones físicas relevantes', required: false, section: 'medical' },
    { id: 'emergencyName', type: 'text', label: 'Nombre Contacto Emergencia', required: true, section: 'medical' },
    { id: 'emergencyPhone', type: 'tel', label: 'Teléfono Contacto Emergencia', required: true, section: 'medical' },
    { id: 'intention', type: 'textarea', label: '¿Qué buscas llevarte de esta experiencia? (Intención)', required: true, section: 'medical' },
];

// Service
export const MockDatabase = {
    // --- Form Fields ---
    getFormFields: (): FormField[] => {
        const stored = localStorage.getItem('home_form_fields');
        if (!stored) {
            localStorage.setItem('home_form_fields', JSON.stringify(DEFAULT_FIELDS));
            return DEFAULT_FIELDS;
        }
        return JSON.parse(stored);
    },

    saveFormFields: (fields: FormField[]) => {
        localStorage.setItem('home_form_fields', JSON.stringify(fields));
    },

    // --- Submissions ---
    getSubmissions: (): FormSubmission[] => {
        const stored = localStorage.getItem('home_form_submissions');
        return stored ? JSON.parse(stored) : [];
    },

    saveSubmission: (data: Record<string, any>) => {
        const submissions = MockDatabase.getSubmissions();
        const newSubmission: FormSubmission = {
            id: uuidv4(),
            submittedAt: new Date().toISOString(),
            data,
            status: 'pending'
        };
        submissions.unshift(newSubmission);
        localStorage.setItem('home_form_submissions', JSON.stringify(submissions));
        return newSubmission;
    },

    updateSubmissionStatus: (id: string, status: FormSubmission['status']) => {
        const submissions = MockDatabase.getSubmissions();
        const index = submissions.findIndex(s => s.id === id);
        if (index !== -1) {
            submissions[index].status = status;
            localStorage.setItem('home_form_submissions', JSON.stringify(submissions));
        }
    },

    // --- Testimonials ---
    getTestimonials: (): Testimonial[] => {
        const stored = localStorage.getItem('home_testimonials');
        if (!stored) {
            // Seed with constants
            const initialData: Testimonial[] = TESTIMONIALS.map(t => ({
                ...t,
                status: 'approved', // Existing ones are approved
                createdAt: new Date().toISOString()
            }));
            localStorage.setItem('home_testimonials', JSON.stringify(initialData));
            return initialData;
        }
        return JSON.parse(stored);
    },

    createTestimonial: (data: Omit<Testimonial, 'id' | 'status' | 'createdAt'>) => {
        const testimonials = MockDatabase.getTestimonials();
        const newTestimonial: Testimonial = {
            ...data,
            id: uuidv4(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        testimonials.unshift(newTestimonial);
        localStorage.setItem('home_testimonials', JSON.stringify(testimonials));
        return newTestimonial;
    },

    updateTestimonialStatus: (id: string | number, status: Testimonial['status']) => {
        const testimonials = MockDatabase.getTestimonials();
        const index = testimonials.findIndex(t => t.id === id);
        if (index !== -1) {
            testimonials[index].status = status;
            localStorage.setItem('home_testimonials', JSON.stringify(testimonials));
        }
    },

    deleteTestimonial: (id: string | number) => {
        const testimonials = MockDatabase.getTestimonials();
        const filtered = testimonials.filter(t => t.id !== id);
        localStorage.setItem('home_testimonials', JSON.stringify(filtered));
    }
};
