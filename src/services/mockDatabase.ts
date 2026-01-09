import { v4 as uuidv4 } from 'uuid';
import { Testimonial } from '../core/types';
import { TESTIMONIALS } from '../core/constants';

// Types
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
    status: 'pending' | 'approved' | 'rejected';
}

// Initial Default Fields
const DEFAULT_FIELDS: FormField[] = [
    // --- PERSONAL ---
    { id: 'firstName', type: 'text', label: 'Nombre', required: true, section: 'personal' },
    { id: 'lastName', type: 'text', label: 'Apellido', required: true, section: 'personal' },
    { id: 'preferredName', type: 'text', label: '¿Cómo te gustaría que te llamen?', required: true, section: 'personal' },
    { id: 'age', type: 'text', label: 'Edad', required: true, section: 'personal' },
    { id: 'dni', type: 'text', label: 'DNI', required: true, section: 'personal' },
    { id: 'gender', type: 'radio', label: 'Género', options: ['Masculino', 'Femenino', 'Prefiero no decirlo', 'Otro'], required: true, section: 'personal' },
    { id: 'phone', type: 'tel', label: 'Celular (WhatsApp)', placeholder: '+54 9...', required: true, section: 'personal' },
    { id: 'address', type: 'text', label: 'Domicilio (Calle, Altura, Localidad)', required: false, section: 'personal' },
    { id: 'occupation', type: 'text', label: 'Ocupación y/o Profesión', required: true, section: 'personal' },
    { id: 'email', type: 'email', label: 'Correo electrónico', required: true, section: 'personal' },
    { id: 'instagram', type: 'text', label: 'Instagram (Opcional)', placeholder: '@usuario', required: false, section: 'personal' },
    { id: 'referredBy', type: 'text', label: '¿Quién te invitó al Programa CreSer? (Nombre y Apellido)', required: true, section: 'personal' },
    { id: 'birthDate', type: 'date', label: 'Fecha de nacimiento', required: true, section: 'personal' },
    { id: 'emergencyName', type: 'text', label: 'Nombre Contacto Emergencia', required: true, section: 'personal' },
    { id: 'emergencyPhone', type: 'tel', label: 'Teléfono Contacto Emergencia', required: true, section: 'personal' },

    // --- DREAMS ---
    { id: 'intention', type: 'textarea', label: '¿Qué querés llevarte de esta experiencia? (Intención)', required: true, section: 'dreams' },
    { id: 'dream1', type: 'textarea', label: 'Sueño 1: ¿Qué querés? ¿Para qué lo querés?', required: true, section: 'dreams' },
    { id: 'dream2', type: 'textarea', label: 'Sueño 2: ¿Qué querés? ¿Para qué lo querés?', required: true, section: 'dreams' },
    { id: 'dream3', type: 'textarea', label: 'Sueño 3: ¿Qué querés? ¿Para qué lo querés?', required: true, section: 'dreams' },

    // --- MEDICAL ---
    { id: 'honestDeclaration', type: 'checkbox', label: 'ACEPTO SER HONESTO Y DETALLISTA EN ESTA DECLARACIÓN JURADA', required: true, section: 'medical' },
    { id: 'underTreatment', type: 'radio', label: '¿Estás bajo tratamiento médico o psicológico actualmente?', options: ['Sí', 'No'], required: true, section: 'medical' },
    { id: 'underTreatmentDetails', type: 'text', label: 'Detalles del tratamiento', required: false, section: 'medical' },
    { id: 'chronicDisease', type: 'radio', label: '¿Padecés alguna enfermedad crónica?', options: ['Sí', 'No'], required: true, section: 'medical' },
    { id: 'chronicDiseaseDetails', type: 'text', label: 'Si respondiste que sí, ¿cuál es esa enfermedad? ¿Desde hace cuánto tiempo estás diagnosticado?', required: false, section: 'medical' },
    { id: 'medication', type: 'radio', label: '¿Tomás alguna medicación?', options: ['Sí', 'No'], required: true, section: 'medical' },
    { id: 'medicationDetails', type: 'text', label: 'Detallar cuál y dosis', required: false, section: 'medical' },
    { id: 'allergies', type: 'radio', label: '¿Tenés alergias o condiciones físicas relevantes?', options: ['Sí', 'No'], required: true, section: 'medical' },
    { id: 'allergiesDetails', type: 'text', label: 'Detallar alergia/condición', required: false, section: 'medical' },
    // Removed treatmentProfessional to avoid duplication with underTreatment
    { id: 'psychiatricTreatment', type: 'radio', label: '¿Actualmente te encontrás bajo tratamiento psiquiátrico y/o psicológico?', options: ['Tratamiento psicológico', 'Tratamiento psiquiátrico', 'Ambos', 'Ninguno'], required: true, section: 'medical' },
    { id: 'psychiatricTreatmentDetails', type: 'text', label: 'Si respondiste que SI a la anterior, ¿cuál es y hace cuánto estás diagnosticado?', required: false, section: 'medical' },
    { id: 'alcoholAbuse', type: 'radio', label: '¿Hacés abuso de bebidas alcohólicas?', options: ['Sí', 'No'], required: true, section: 'medical' },
    { id: 'drugConsumption', type: 'radio', label: '¿Consumís alguna droga?', options: ['Sí', 'No'], required: true, section: 'medical' },
    { id: 'drugConsumptionDetails', type: 'text', label: 'Si respondiste que sí, contanos que tipo de drogas consumis, desde qué edad y con que frecuencia lo haces?', required: false, section: 'medical' },
    { id: 'addictionTreatment', type: 'radio', label: '¿Hiciste algún tratamiento de recuperación en adicciones en el último año o lo estás haciendo?', options: ['Sí', 'No'], required: true, section: 'medical' },
    { id: 'pregnant', type: 'radio', label: '¿Estás embarazada?', options: ['Sí', 'No'], required: true, section: 'medical' },

    // --- EXTRA ---
    { id: 'context', type: 'textarea', label: 'Contanos brevemente tu contexto actual: ¿Con quiénes vivís? ¿Qué te gusta hacer?', required: false, section: 'extra' },
    { id: 'qualities', type: 'textarea', label: '¿Cuáles considerás que son cualidades que te diferencian?', required: false, section: 'extra' },
    { id: 'dailyRoutine', type: 'textarea', label: '¿Cómo suele ser un día tuyo?', required: false, section: 'extra' },
    { id: 'energyLeaks', type: 'textarea', label: 'En el caso de tenerlas, ¿cuáles creés que suelen ser tus fugas de energía?', required: false, section: 'extra' },
    { id: 'lifeHistory', type: 'textarea', label: 'Contanos lo que te parezca importante que sepamos de tu historia de vida!', required: false, section: 'extra' },
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
