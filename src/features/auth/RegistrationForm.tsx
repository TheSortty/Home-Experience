import React, { useState, useEffect, useRef, memo } from 'react';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';
import { MockDatabase, FormField } from '../../services/mockDatabase';
import ArrowRightIcon from '../../ui/icons/ArrowRightIcon';
import CheckIcon from '../../ui/icons/CheckIcon';
import PhoneInput from '../../ui/inputs/PhoneInput';
import PaymentOptions from './PaymentOptions';

interface RegistrationFormProps {
    onBack: () => void;
    onSubmitSuccess: () => void;
}

type Step = 'intro' | 'personal' | 'dreams' | 'medical' | 'extra' | 'payment' | 'success';

const STEPS_ORDER: Step[] = ['intro', 'personal', 'dreams', 'medical', 'extra', 'payment', 'success'];

// --- Sub-Components (Moved outside to prevent re-renders/focus loss) ---

interface FieldProps {
    field: FormField;
    value: any;
    error: boolean;
    onChange: (name: string, value: any) => void;
}

const DateSelect = ({ value, onChange, error }: { value: string, onChange: (val: string) => void, error: boolean }) => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    useEffect(() => {
        if (value && value.includes('-')) {
            const [y, m, d] = value.split('-');
            if (y !== year) setYear(y);
            if (m !== month) setMonth(m);
            if (d !== day) setDay(d);
        }
    }, [value]);

    const handleChange = (type: 'd' | 'm' | 'y', val: string) => {
        let d = type === 'd' ? val : day;
        let m = type === 'm' ? val : month;
        let y = type === 'y' ? val : year;

        // Ensure 2-digit padding for month/day
        const paddedD = d && d.length === 1 ? d.padStart(2, '0') : d;
        const paddedM = m && m.length === 1 ? m.padStart(2, '0') : m;

        if (type === 'd') setDay(paddedD);
        if (type === 'm') setMonth(paddedM);
        if (type === 'y') setYear(y);

        if (paddedD && paddedM && y) {
            onChange(`${y}-${paddedM}-${paddedD}`);
        } else {
            onChange('');
        }
    };

    const selectClass = `w-full p-4 rounded-xl border text-lg outline-none focus:ring-4 transition-all appearance-none cursor-pointer bg-white text-center ${error
        ? 'border-red-300 bg-red-50 focus:ring-red-100'
        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
        }`;

    return (
        <div className="flex gap-3 w-full">
            <div className="relative flex-1">
                <select value={day} onChange={e => handleChange('d', e.target.value)} className={selectClass}>
                    <option value="">Día</option>
                    {days.map(d => {
                        const val = d.toString().padStart(2, '0');
                        return <option key={val} value={val}>{d}</option>;
                    })}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
            <div className="relative flex-[1.5]">
                <select value={month} onChange={e => handleChange('m', e.target.value)} className={selectClass}>
                    <option value="">Mes</option>
                    {months.map((m, i) => {
                        const val = (i + 1).toString().padStart(2, '0');
                        return <option key={val} value={val}>{m}</option>;
                    })}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
            <div className="relative flex-[1.2]">
                <select value={year} onChange={e => handleChange('y', e.target.value)} className={selectClass}>
                    <option value="">Año</option>
                    {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>
    );
};

const RenderField = memo(({ field, value, error, onChange }: FieldProps) => {
    // Dynamic Classes for "Premium & Comfortable" feel
    const labelClass = "block text-lg font-medium text-slate-800 mb-2";
    const inputBaseClass = `w-full p-4 rounded-xl border text-lg transition-all outline-none focus:ring-4 ${error ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-100'
        }`;

    if (field.id === 'phone' || field.id === 'emergencyPhone') {
        return (
            <div id={field.id}>
                <label className={labelClass}>{field.label} {field.required && '*'}</label>
                <PhoneInput
                    value={value || ''}
                    onChange={(val) => onChange(field.id, val)}
                    required={field.required}
                    className={error ? 'ring-2 ring-red-200 rounded-xl' : ''}
                />
                {error && <p className="text-red-500 text-sm mt-1">Este campo es obligatorio</p>}
            </div>
        );
    }

    if (field.type === 'date') {
        return (
            <div id={field.id}>
                <label className={labelClass}>{field.label} {field.required && '*'}</label>
                <DateSelect
                    value={value || ''}
                    onChange={(val) => onChange(field.id, val)}
                    error={error}
                />
                {error && <p className="text-red-500 text-sm mt-1">Este campo es obligatorio</p>}
            </div>
        );
    }

    switch (field.type) {
        case 'textarea':
            return (
                <div id={field.id} className="col-span-1 md:col-span-2">
                    <label className={labelClass}>{field.label} {field.required && '*'}</label>
                    <textarea
                        rows={4}
                        className={inputBaseClass}
                        value={value || ''}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        placeholder={field.placeholder || "Escribe tu respuesta aquí..."}
                    />
                    {error && <p className="text-red-500 text-sm mt-1">Por favor completa este campo</p>}
                </div>
            );
        case 'select':
            return (
                <div id={field.id}>
                    <label className={labelClass}>{field.label} {field.required && '*'}</label>
                    <div className="relative">
                        <select
                            className={`${inputBaseClass} cursor-pointer appearance-none`}
                            value={value || ''}
                            onChange={(e) => onChange(field.id, e.target.value)}
                        >
                            <option value="">Seleccionar opción...</option>
                            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-1">Selecciona una opción</p>}
                </div>
            );
        case 'radio':
            return (
                <div id={field.id} className="col-span-1 md:col-span-2">
                    <label className={labelClass}>{field.label} {field.required && '*'}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {field.options?.map(opt => {
                            const isSelected = value === opt;
                            return (
                                <label key={opt} className={`cursor-pointer p-5 rounded-xl border-2 transition-all flex items-center justify-between group ${isSelected
                                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md'
                                    : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'
                                    }`}>
                                    <span className="text-lg font-medium">{opt}</span>
                                    <input
                                        type="radio"
                                        className="hidden"
                                        name={field.id}
                                        value={opt}
                                        checked={isSelected}
                                        onChange={(e) => onChange(field.id, e.target.value)}
                                    />
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-600' : 'border-slate-300'}`}>
                                        {isSelected && <div className="w-3 h-3 rounded-full bg-blue-600" />}
                                    </div>
                                </label>
                            )
                        })}
                    </div>
                    {error && <p className="text-red-500 text-sm mt-1">Selecciona una opción</p>}
                </div>
            );
        case 'checkbox':
            return (
                <div id={field.id} className="col-span-1 md:col-span-2 text-left">
                    <label className={`cursor-pointer group relative p-6 rounded-xl border-2 transition-all flex items-start gap-5 ${value ? 'border-blue-600 bg-blue-50/50 shadow-sm' : error ? 'border-red-300 bg-red-50' : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                        }`}>
                        <div className={`mt-1 h-7 w-7 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${value ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                            {value && (
                                <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={!!value}
                            onChange={(e) => onChange(field.id, e.target.checked)}
                        />
                        <span className={`text-lg leading-relaxed font-semibold transition-colors select-none ${value ? 'text-blue-900' : 'text-slate-600'}`}>
                            {field.label}
                        </span>
                    </label>
                    {error && <p className="mt-2 text-xs font-bold text-red-500 uppercase tracking-widest text-center md:text-left ml-4">Debes aceptar para continuar</p>}
                </div>
            );
        default: // text, email, etc.
            return (
                <div id={field.id}>
                    <label className={labelClass}>{field.label} {field.required && '*'}</label>
                    <input
                        type={field.type}
                        className={inputBaseClass}
                        value={value || ''}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                    />
                    {error && <p className="text-red-500 text-sm mt-1">Este campo es obligatorio</p>}
                </div>
            );
    }
});

const LoginIntroStep = ({ onNext }: { onNext: () => void }) => (
    <div className="text-center max-w-2xl mx-auto py-8 px-4 animate-fade-in">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-6">Programa CRESER</h2>
        <p className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed mb-12">
            Bienvenido/a. Este es el primer paso de tu viaje.<br />
            Por favor, tomate unos minutos para completar esta ficha con tranquilidad.
        </p>

        <div className="bg-blue-50 p-5 sm:p-8 rounded-2xl border border-blue-100 mb-12 text-left shadow-sm">
            <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Información Importante
            </h3>
            <p className="text-blue-800/80 text-base sm:text-lg">
                Tus respuestas son confidenciales y tienen carácter de <strong>declaración jurada</strong>.
            </p>
        </div>

        <button onClick={onNext} className="inline-flex items-center gap-3 px-6 sm:px-10 py-4 sm:py-5 bg-slate-900 text-white text-base sm:text-xl font-bold rounded-full hover:bg-blue-600 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
            Comenzar Inscripción
            <ArrowRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
    </div>
);

const FormStepContent = ({
    section,
    title,
    description,
    fields,
    formData,
    errors,
    onNext,
    onPrev,
    onChange
}: {
    section: string,
    title: string,
    description?: string,
    fields: FormField[],
    formData: any,
    errors: any,
    onNext: () => void,
    onPrev: () => void,
    onChange: (name: string, value: any) => void
}) => {

    // Helper to determine visibility
    const isFieldHidden = (id: string, data: Record<string, any>) => {
        if (id === 'underTreatmentDetails' && data['underTreatment'] !== 'Sí') return true;
        if (id === 'chronicDiseaseDetails' && data['chronicDisease'] !== 'Sí') return true;
        if (id === 'medicationDetails' && data['medication'] !== 'Sí') return true;
        if (id === 'allergiesDetails' && data['allergies'] !== 'Sí') return true;
        if (id === 'psychiatricTreatmentDetails' && (!data['psychiatricTreatment'] || data['psychiatricTreatment'] === 'Ninguno')) return true;
        if (id === 'drugConsumptionDetails' && data['drugConsumption'] !== 'Sí') return true;
        return false;
    };

    return (
        <div className="max-w-3xl mx-auto py-4 animate-fade-in-up">
            <div className="mb-10 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-2">{title}</h2>
                {description && <p className="text-lg text-slate-500">{description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {fields.filter(f => f.section === section).map(field => {
                    const hidden = isFieldHidden(field.id, formData);
                    if (hidden) return null;
                    return (
                        <div key={field.id} className={`${field.type === 'textarea' || field.type === 'radio' || field.type === 'checkbox' ? 'col-span-1 md:col-span-2' : ''} animate-fade-in`}>
                            <RenderField
                                field={field}
                                value={formData[field.id]}
                                error={errors[field.id]}
                                onChange={onChange}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-between gap-4 pt-8 border-t border-slate-100">
                <button
                    onClick={onPrev}
                    className="px-8 py-4 text-slate-500 font-bold hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors text-lg"
                >
                    Atrás
                </button>
                <button
                    onClick={onNext}
                    className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full hover:bg-blue-600 transition-all shadow-lg text-lg flex items-center justify-center gap-2"
                >
                    Siguiente Paso
                    <ArrowRightIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const PaymentConfirmationStep = ({ onPrev, onSubmit, isSubmitting }: { onPrev: () => void, onSubmit: () => void, isSubmitting: boolean }) => (
    <div className="max-w-3xl mx-auto py-4 animate-fade-in-up">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 font-serif">Confirmación y Legales</h2>

        <div className="space-y-6 mb-10">
            {/* GARANTÍA */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <span className="text-2xl">✨</span>
                        GARANTÍA DE SATISFACCIÓN
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        El <strong>PROGRAMA CRESER</strong> tiene una garantía de satisfacción que consiste en que si abonaste tu programa y realizaste los primeros 9 días del <strong>nivel I y nivel II</strong>, transitando todas sus propuestas y dinámicas, y eso no hizo una diferencia en tu ser <strong>consciente</strong>, podrás pedir la devolución del dinero el día <strong>Lunes siguiente al Domingo de cierre</strong> del noveno día.
                        <br /><br />
                        Dicho reclamo se realiza al número de WhatsApp de HOME, desarrollando primero un informe con una devolución a modo de dar a conocer las razones de la insatisfacción.
                        <br />
                        <strong>¡Nos gusta escucharte y aprender!</strong>
                    </p>
                </div>
            </div>

            {/* POLÍTICA DE PAGOS */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <span className="text-2xl">💳</span>
                        POLÍTICA DE PAGOS Y CANCELACIÓN
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        El dinero abonado tendrá validez para el entrenamiento al que te inscribiste o a uno inmediato posterior.
                        Pasado dicho plazo, el importe abonado quedará sin efecto.
                        <br /><br />
                        <strong>IMPORTANTE:</strong> El dinero abonado no será reembolsado ni transferido a otras personas u otros contenidos <strong>SIN EXCEPCIÓN</strong>.
                    </p>
                </div>
            </div>

            {/* CONFIRMACIÓN FINAL */}
            <div className="bg-white p-8 rounded-2xl border-2 border-blue-100 shadow-xl">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Declaración Final</h3>
                <label className="flex items-start gap-4 cursor-pointer p-4 bg-blue-50/50 rounded-xl hover:bg-blue-50 transition-colors">
                    <input
                        type="checkbox"
                        required
                        className="w-6 h-6 mt-1 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="space-y-1">
                        <span className="text-base font-bold text-slate-800">
                            He leído y acepto la Garantía de Satisfacción y las Políticas de Pago.
                        </span>
                        <p className="text-sm text-slate-500">
                            Declaro que la información proporcionada en este formulario es real y asumo el compromiso con el programa.
                        </p>
                    </div>
                </label>
            </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row justify-between gap-4">
            <button
                onClick={onPrev}
                disabled={isSubmitting}
                className="px-8 py-4 text-slate-500 font-bold hover:text-slate-800 transition-colors text-lg"
            >
                Atrás
            </button>
            <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className={`px-12 py-5 bg-blue-600 text-white rounded-full font-bold transition-all shadow-xl flex items-center justify-center gap-3 text-lg ${isSubmitting ? 'opacity-75 cursor-wait' : 'hover:bg-blue-700 hover:shadow-blue-600/30'
                    }`}
            >
                {isSubmitting ? 'Procesando...' : (
                    <>
                        Confirmar Inscripción
                        <CheckIcon className="w-6 h-6" />
                    </>
                )}
            </button>
        </div>
    </div>
);

const SuccessScreen = () => (
    <div className="text-center max-w-4xl mx-auto py-12 animate-fade-in-up">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce-soft">
            <CheckIcon className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">¡Inscripción Recibida!</h2>
        <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
            Tu lugar está reservado. Para finalizar, por favor selecciona cómo deseas realizar tu inversión:
        </p>
        <PaymentOptions />
    </div>
);

// --- Main Component ---

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onBack }) => {
    // --- State ---
    const [currentStep, setCurrentStep] = useState<Step>('intro');
    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingSchema, setIsLoadingSchema] = useState(false);
    const [formId, setFormId] = useState<string | null>(null);

    // Modals
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    // Refs for scrolling
    const topRef = useRef<HTMLDivElement>(null);

    // --- Init ---
    useEffect(() => {
        fetchFormSchema();
    }, []);

    const injectSelectedService = (schema: FormField[]) => {
        if (!schema.some((f: any) => f.id === 'selectedService')) {
            const comboField: FormField = {
                id: 'selectedService',
                type: 'radio',
                label: '¿Qué experiencia estás a punto de iniciar?',
                required: true,
                section: 'personal',
                options: [
                    'CRESER (Solo Inicial)',
                    'COMBO 1 (Inicial + Avanzado)',
                    'COMBO 2 (Inicial + Avanzado + PL)'
                ]
            };
            const pIdx = schema.findIndex((f: any) => f.section === 'personal');
            if (pIdx > -1) {
                schema.splice(pIdx, 0, comboField);
            } else {
                schema.unshift(comboField);
            }
        }
        return schema;
    };

    const fetchFormSchema = async () => {
        setIsLoadingSchema(true);
        try {
            const { data, error } = await supabase
                .from('forms')
                .select('id, schema')
                .eq('slug', 'inscripcion-creser')
                .single();

            if (data && data.schema) {
                console.log('Form schema fetched successfully from Supabase:', data.id);
                let schema = Array.isArray(data.schema) ? data.schema : JSON.parse(data.schema);
                
                // Log the sections found in the schema to help debug missing steps
                const sections = [...new Set(schema.map((f: any) => f.section))];
                console.log('Available sections in fetched schema:', sections);

                schema = injectSelectedService(schema);
                setFields(schema);
                setFormId(data.id);

                // Initialize data for new fields
                setFormData(prev => {
                    const initialData = { ...prev };
                    schema.forEach((field: FormField) => {
                        if (initialData[field.id] === undefined) {
                            initialData[field.id] = '';
                        }
                    });
                    return initialData;
                });
            } else {
                throw new Error('No schema found');
            }
        } catch (err) {
            console.error('Error fetching form schema, using fallback:', err);
            let loadedFields = [...MockDatabase.getFormFields()];
            loadedFields = injectSelectedService(loadedFields);
            setFields(loadedFields);
            
            // Initialize data for fallback fields
            setFormData(prev => {
                const initialData = { ...prev };
                loadedFields.forEach((field: FormField) => {
                    if (initialData[field.id] === undefined) {
                        initialData[field.id] = '';
                    }
                });
                return initialData;
            });
        } finally {
            setIsLoadingSchema(false);
        }
    };

    // --- Helpers ---
    const scrollToTop = () => {
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const getStepProgress = () => {
        const index = STEPS_ORDER.indexOf(currentStep);
        const total = STEPS_ORDER.length - 1;
        return Math.min(100, Math.round((index / total) * 100));
    };

    const isFieldHidden = (id: string, data: Record<string, any>) => {
        if (id === 'underTreatmentDetails' && data['underTreatment'] !== 'Sí') return true;
        if (id === 'chronicDiseaseDetails' && data['chronicDisease'] !== 'Sí') return true;
        if (id === 'medicationDetails' && data['medication'] !== 'Sí') return true;
        if (id === 'allergiesDetails' && data['allergies'] !== 'Sí') return true;
        if (id === 'psychiatricTreatmentDetails' && (!data['psychiatricTreatment'] || data['psychiatricTreatment'] === 'Ninguno')) return true;
        if (id === 'drugConsumptionDetails' && data['drugConsumption'] !== 'Sí') return true;
        return false;
    };

    // --- Handlers ---
    const handleChange = (name: string, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // "Silent Auto-fill" Logic
            const autoFillMaps: Record<string, string> = {
                'underTreatment': 'underTreatmentDetails',
                'chronicDisease': 'chronicDiseaseDetails',
                'medication': 'medicationDetails',
                'allergies': 'allergiesDetails',
                'drugConsumption': 'drugConsumptionDetails',
            };

            // Handle Yes/No Toggles
            if (autoFillMaps[name]) {
                if (value === 'No') newData[autoFillMaps[name]] = 'No aplica';
                else if (value === 'Sí') newData[autoFillMaps[name]] = '';
            }

            // Handle Psychiatric special case
            if (name === 'psychiatricTreatment') {
                if (value === 'Ninguno') newData['psychiatricTreatmentDetails'] = 'No aplica';
                else newData['psychiatricTreatmentDetails'] = '';
            }

            return newData;
        });

        // Clear error immediately on change
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: false }));
        }
    };

    const validateSection = (section: string): boolean => {
        const sectionFields = fields.filter(f => f.section === section);
        const newErrors: Record<string, boolean> = {};
        let isValid = true;

        sectionFields.forEach(field => {
            if (isFieldHidden(field.id, formData)) return;

            // Optional special logic for referredBy
            if (field.id === 'referredBy' && !formData[field.id]) return;

            if (field.required && !formData[field.id]) {
                newErrors[field.id] = true;
                isValid = false;
            }
        });

        // Specific Medical Check
        if (section === 'medical') {
            const details = [
                'underTreatmentDetails', 'chronicDiseaseDetails', 'medicationDetails',
                'allergiesDetails', 'psychiatricTreatmentDetails', 'drugConsumptionDetails'
            ];
            details.forEach(id => {
                if (!isFieldHidden(id, formData) && !formData[id]) {
                    newErrors[id] = true;
                    isValid = false;
                }
            });
        }

        if (!isValid) {
            setErrors(newErrors);
            const firstErrorId = Object.keys(newErrors)[0];
            const el = document.getElementById(firstErrorId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                scrollToTop();
            }
            toast.error(`Faltan completar campos obligatorios en esta sección (${section}). Por favor revisa las opciones marcadas en rojo.`, { duration: 5000 });
        }

        return isValid;
    };

    const nextStep = () => {
        let isValid = true;

        if (currentStep === 'personal') isValid = validateSection('personal');
        else if (currentStep === 'dreams') isValid = validateSection('dreams');
        else if (currentStep === 'medical') isValid = validateSection('medical');
        else if (currentStep === 'extra') isValid = validateSection('extra');

        if (isValid) {
            const currIndex = STEPS_ORDER.indexOf(currentStep);
            if (currIndex < STEPS_ORDER.length - 1) {
                setCurrentStep(STEPS_ORDER[currIndex + 1]);
                scrollToTop();
            }
        }
    };

    const prevStep = () => {
        const currIndex = STEPS_ORDER.indexOf(currentStep);
        if (currIndex > 0) {
            setCurrentStep(STEPS_ORDER[currIndex - 1]);
            scrollToTop();
        } else {
            onBack();
        }
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Submit to form_submissions table.
            // Importante: poblar la columna email también (no solo data.email) porque
            // AdminStudents y AdminCalendar consultan por la columna indexada con .in('email', ...).
            const { error } = await supabase
                .from('form_submissions')
                .insert([{
                    form_id: formId,
                    data: formData,
                    email: (formData.email || '').trim().toLowerCase() || null,
                    status: 'pending'
                }]);

            if (error) throw error;
            
            // Synthesize the record object for the Edge Function since we cannot .select() it via RLS
            const submittedRecord = {
                data: formData,
                form_id: formId,
                status: 'pending'
            };

            // Optional: send email notification - Wrapped to prevent submission blockage
            try {
                await supabase.functions.invoke('send-email', { body: { record: submittedRecord } });
            } catch (emailErr) {
                console.warn('Silent failure sending enrollment email:', emailErr);
            }

            setCurrentStep('success');
            scrollToTop();
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar. Por favor intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 md:py-12 md:px-8 flex flex-col items-center" ref={topRef}>
            {/* Header / Nav */}
            <div className="w-full max-w-5xl flex justify-between items-center mb-8">
                <div className="text-2xl font-black tracking-tighter text-slate-900">HOME<span className="text-blue-600">.</span></div>
                <button onClick={onBack} className="text-slate-400 hover:text-slate-900 transition-colors p-2">
                    <span className="sr-only">Cerrar</span>
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Progress Bar (Skipped on Intro/Success) */}
            {currentStep !== 'intro' && currentStep !== 'success' && (
                <div className="w-full max-w-3xl mb-12">
                    <div className="flex justify-between text-sm uppercase tracking-wider font-bold text-slate-400 mb-3">
                        <span>Paso {STEPS_ORDER.indexOf(currentStep)} de 6</span>
                        <span>{Math.round(getStepProgress())}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-700 ease-out rounded-full"
                            style={{ width: `${getStepProgress()}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Card Content */}
            <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 md:p-12 lg:p-16 min-h-[60vh] flex flex-col justify-center">

                {currentStep === 'intro' && <LoginIntroStep onNext={nextStep} />}

                {currentStep === 'personal' && (
                    <FormStepContent
                        section="personal"
                        title="Sobre Vos"
                        description="Empecemos por conocernos un poco."
                        fields={fields}
                        formData={formData}
                        errors={errors}
                        onNext={nextStep}
                        onPrev={prevStep}
                        onChange={handleChange}
                    />
                )}

                {currentStep === 'dreams' && (
                    <FormStepContent
                        section="dreams"
                        title="Tus Sueños"
                        description="¿Qué es lo que verdaderamente anhelas?"
                        fields={fields}
                        formData={formData}
                        errors={errors}
                        onNext={nextStep}
                        onPrev={prevStep}
                        onChange={handleChange}
                    />
                )}

                {currentStep === 'medical' && (
                    <FormStepContent
                        section="medical"
                        title="Ficha Médica"
                        description="Información importante para cuidarte mejor."
                        fields={fields}
                        formData={formData}
                        errors={errors}
                        onNext={nextStep}
                        onPrev={prevStep}
                        onChange={handleChange}
                    />
                )}

                {currentStep === 'extra' && (
                    <FormStepContent
                        section="extra"
                        title="Más de Vos"
                        description="Preguntas opcionales para profundizar."
                        fields={fields}
                        formData={formData}
                        errors={errors}
                        onNext={nextStep}
                        onPrev={prevStep}
                        onChange={handleChange}
                    />
                )}

                {currentStep === 'payment' && (
                    <PaymentConfirmationStep
                        onPrev={prevStep}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                    />
                )}

                {currentStep === 'success' && <SuccessScreen />}

            </div>

            {/* TERMS MODAL */}
            {showTerms && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[80vh] overflow-y-auto">
                        <button onClick={() => setShowTerms(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h3 className="text-2xl font-bold mb-4 font-serif">Términos y Condiciones</h3>
                        <div className="prose prose-slate text-sm">
                            <p>En beneficio de ambas partes, se establecen los siguientes términos:</p>
                            <ul>
                                <li><strong>Compromiso:</strong> El participante se compromete a respetar los horarios y dinámicas del programa.</li>
                                <li><strong>Asistencia:</strong> La asistencia a todos los módulos es obligatoria para la certificación.</li>
                                <li><strong>Confidencialidad:</strong> Todo lo compartido dentro del espacio (presencial o virtual) es estrictamente confidencial.</li>
                                <li><strong>Responsabilidad:</strong> HOME no se hace responsable por objetos personales perdidos durante el evento.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* PRIVACY MODAL */}
            {showPrivacy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[80vh] overflow-y-auto">
                        <button onClick={() => setShowPrivacy(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h3 className="text-2xl font-bold mb-4 font-serif">Política de Privacidad</h3>
                        <div className="prose prose-slate text-sm">
                            <p>Tus datos están seguros con nosotros:</p>
                            <ul>
                                <li><strong>Uso de Datos:</strong> La información recolectada se utiliza únicamente para fines de organización, seguridad y contacto relacionados con el programa CRESER.</li>
                                <li><strong>No Compartir:</strong> No vendemos ni compartimos tu información personal con terceros.</li>
                                <li><strong>Derecho de Imagen:</strong> Durante el evento se pueden tomar fotografías con fines promocionales, respetando siempre la integridad de los participantes.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistrationForm;
