import React, { useState, useEffect } from 'react';
import ArrowRightIcon from '../../ui/icons/ArrowRightIcon';
import CheckIcon from '../../ui/icons/CheckIcon';
import { MockDatabase, FormField } from '../../services/mockDatabase';
import { supabase } from '../../services/supabaseClient';
import PhoneInput from '../../ui/inputs/PhoneInput';

interface RegistrationFormProps {
    onBack: () => void;
    onSubmitSuccess: () => void;
}

type Step = 'intro' | 'personal' | 'medical' | 'payment' | 'success';

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onBack, onSubmitSuccess }) => {
    const [currentStep, setCurrentStep] = useState<Step>('intro');
    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Medical Section Toggles
    const [hasTreatment, setHasTreatment] = useState<boolean | null>(null);
    const [hasMedication, setHasMedication] = useState<boolean | null>(null);
    const [hasAllergies, setHasAllergies] = useState<boolean | null>(null);

    // Terms Modal State
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    useEffect(() => {
        const loadedFields = MockDatabase.getFormFields();
        setFields(loadedFields);

        // Initialize form data
        const initialData: Record<string, any> = {};
        loadedFields.forEach(field => {
            initialData[field.id] = '';
        });
        setFormData(initialData);
    }, []);

    const handleChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error if exists
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: false }));
        }
    };

    const validateSection = (section: string): boolean => {
        const sectionFields = fields.filter(f => f.section === section);
        const newErrors: Record<string, boolean> = {};
        let isValid = true;

        sectionFields.forEach(field => {
            // Skip validation for fields that are conditionally hidden/handled
            if (section === 'medical') {
                if (field.id === 'treatmentDetails' && !hasTreatment) return;
                if (field.id === 'medication' && !hasMedication) return;
                if (field.id === 'allergies' && !hasAllergies) return;
            }

            // Special auto-complete logic before validation
            if (field.id === 'referredBy' && !formData[field.id]) {
                handleChange(field.id, 'No aplica');
                return;
            }

            // Note: Allergies is now handled via Toggle logic below, so we skip standard required check if it matches the ID
            if (field.id === 'allergies') return;

            if (field.required && !formData[field.id]) {
                newErrors[field.id] = true;
                isValid = false;
            }
        });

        // Custom Logic Validation for Medical Toggles
        if (section === 'medical') {
            if (hasTreatment === null) { isValid = false; alert("Por favor indica si estás bajo tratamiento."); }
            if (hasMedication === null) { isValid = false; alert("Por favor indica si tomas medicación."); }
            if (hasAllergies === null) { isValid = false; alert("Por favor indica si tienes alergias o condiciones."); }

            // Auto-fill logic for NOs (ensure data is consistent)
            if (hasTreatment === false && !formData['treatmentDetails']) handleChange('treatmentDetails', 'No aplica');
            if (hasMedication === false && !formData['medication']) handleChange('medication', 'No aplica');
            if (hasAllergies === false && !formData['allergies']) handleChange('allergies', 'Perfecto estado');
        }

        setErrors(newErrors);
        return isValid;
    };

    const nextStep = () => {
        let isValid = true;
        if (currentStep === 'personal') isValid = validateSection('personal');
        if (currentStep === 'medical') isValid = validateSection('medical');

        if (isValid) {
            if (currentStep === 'intro') setCurrentStep('personal');
            else if (currentStep === 'personal') setCurrentStep('medical');
            else if (currentStep === 'medical') setCurrentStep('payment');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Find first error and scroll to it
            const firstError = Object.keys(errors).find(key => errors[key]);
            if (firstError) {
                const element = document.getElementsByName(firstError)[0];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.focus();
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    const prevStep = () => {
        if (currentStep === 'personal') setCurrentStep('intro');
        else if (currentStep === 'medical') setCurrentStep('personal');
        else if (currentStep === 'payment') setCurrentStep('medical');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        console.log('Enviando a Supabase...', formData);

        try {
            // 1. Guardar en Base de Datos (Insertar el registro)
            const { data, error } = await supabase
                .from('registrations')
                .insert([{ data: formData, status: 'PENDING_REVIEW' }])
                .select()
                .single(); // Es importante el .select().single() para recuperar el registro creado

            if (error) throw error;

            // 2. Disparar Email (Invocar Edge Function)
            // Llamamos a la función 'send-email' pasándole el registro recién creado
            const { error: funcError } = await supabase.functions.invoke('send-email', {
                body: { record: data }
            });

            if (funcError) {
                console.error('Error enviando email:', funcError);
                // No bloqueamos el flujo de éxito si falla el email, solo lo logueamos
            }

            // 3. Éxito
            // 3. Éxito
            setCurrentStep('success'); // Ensure UI updates to show success/payment screen
            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Do NOT call onSubmitSuccess() here, otherwise the parent (App.tsx) unmounts us immediately.
            // We want to show the Success/Payment screen. The user can close it via the 'X' button (onBack).

        } catch (err) {
            console.error('Error inesperado:', err);
            // alert('Ocurrió un error inesperado. Intenta de nuevo.'); 
            // Commented out alert to avoid interrupting user, or could keep it. 
            // Existing code used alert. I'll keep the alert behavior if it fails main insert.
            alert('Error al guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderLabel = (field: FormField) => (
        <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-bold text-slate-700 block">
                {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            {errors[field.id] && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    Obligatorio
                </span>
            )}
        </div>
    );

    const renderField = (field: FormField) => {
        const commonClasses = `w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${errors[field.id] ? 'border-red-400 bg-red-50' : 'border-slate-200'
            }`;

        if (field.id === 'phone' || field.id === 'emergencyPhone') {
            return (
                <PhoneInput
                    value={formData[field.id] || ''}
                    onChange={(val) => handleChange(field.id, val)}
                    required={field.required}
                    className={errors[field.id] ? 'border-red-400 rounded-lg ring-2 ring-red-100' : ''}
                />
            );
        }

        switch (field.type) {
            case 'textarea':
                return (
                    <textarea
                        name={field.id}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className={commonClasses}
                        rows={3}
                        placeholder={field.placeholder}
                    />
                );
            case 'select':
                return (
                    <select
                        name={field.id}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className={commonClasses}
                    >
                        <option value="">Seleccionar...</option>
                        {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'radio':
                return (
                    <div className="flex gap-4">
                        {field.options?.map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name={field.id}
                                    value={opt}
                                    checked={formData[field.id] === opt}
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            default:
                return (
                    <input
                        type={field.type}
                        name={field.id}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className={commonClasses}
                        placeholder={field.placeholder}
                    />
                );
        }
    };

    const renderSectionFields = (sectionName: string) => {
        return fields
            .filter(f => f.section === sectionName)
            // Filter out fields we handle manually in Medical section: Treatment, Medication, AND now Allergies
            .filter(f => sectionName !== 'medical' || !['underTreatment', 'treatmentDetails', 'medication', 'allergies'].includes(f.id))
            .map(field => (
                <div key={field.id} className="space-y-1">
                    {renderLabel(field)}
                    {renderField(field)}
                </div>
            ));
    };

    // --- RENDERERS ---

    const renderIntro = () => (
        <div className="space-y-6 animate-fade-in-up">
            <div className="text-center space-y-4 mb-10">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900">Programa CRESER</h2>
                <p className="text-blue-600 font-bold tracking-widest uppercase text-sm">Diciembre 2025</p>
            </div>
            <div className="prose prose-slate mx-auto text-slate-600 leading-relaxed text-center">
                <p className="font-medium text-lg text-slate-800">
                    ¡Felicitaciones por tu decisión de participar!
                </p>
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 my-6 text-left">
                    <h4 className="font-bold text-blue-900 mb-2">Importante</h4>
                    <p className="text-sm text-blue-800">
                        Completa este formulario como declaración jurada. Tus datos son confidenciales.
                    </p>
                </div>
            </div>
            <div className="flex justify-center pt-8">
                <button onClick={nextStep} className="group relative px-8 py-4 bg-slate-900 text-white rounded-full font-medium overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-900/20">
                    <span className="relative z-10 flex items-center">
                        Comenzar Inscripción
                        <ArrowRightIcon className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                </button>
            </div>
        </div>
    );

    const renderPersonal = () => (
        <div className="space-y-6 animate-fade-in-up">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Datos Personales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderSectionFields('personal')}
            </div>
            <div className="flex justify-between pt-8">
                <button type="button" onClick={prevStep} className="px-6 py-3 text-slate-500 hover:text-slate-800 font-medium transition-colors">Atrás</button>
                <button onClick={nextStep} className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold hover:bg-blue-600 transition-colors shadow-lg">Siguiente</button>
            </div>
        </div>
    );

    const renderMedical = () => (
        <div className="space-y-8 animate-fade-in-up">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Ficha Médica y Salud</h3>
            <p className="text-sm text-slate-500 italic mb-6">Esta información tiene carácter de Declaración Jurada.</p>

            {/* Custom Yes/No Logic for Treatment */}
            <div className="space-y-4 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <label className="text-base font-bold text-slate-800 block">
                    ¿Estás bajo tratamiento médico o psicológico actualmente? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                    <button
                        className={`flex-1 py-3 rounded-lg font-bold border transition-all ${hasTreatment === true ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                        onClick={() => { setHasTreatment(true); handleChange('underTreatment', 'Sí'); }}
                    >
                        SÍ
                    </button>
                    <button
                        className={`flex-1 py-3 rounded-lg font-bold border transition-all ${hasTreatment === false ? 'bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                        onClick={() => { setHasTreatment(false); handleChange('underTreatment', 'No'); handleChange('treatmentDetails', 'No aplica'); }}
                    >
                        NO
                    </button>
                </div>

                <div className={`transition-all duration-300 ${hasTreatment === null ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto mt-4'}`}>
                    <label className="text-sm font-bold text-slate-700 block mb-2">
                        Detalles del tratamiento {hasTreatment && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${hasTreatment === false
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200'
                            : 'bg-white border-slate-200'
                            }`}
                        rows={3}
                        placeholder="Describe brevemente..."
                        value={hasTreatment === false ? 'No aplica' : (formData['treatmentDetails'] || '')}
                        onChange={(e) => handleChange('treatmentDetails', e.target.value)}
                        disabled={hasTreatment === false}
                    />
                    {hasTreatment && !formData['treatmentDetails'] && errors['treatmentDetails'] && (
                        <span className="text-xs text-red-500 font-bold mt-1 block">Este campo es obligatorio si seleccionaste SÍ</span>
                    )}
                </div>
            </div>

            {/* Custom Yes/No Logic for Medication */}
            <div className="space-y-4 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <label className="text-base font-bold text-slate-800 block">
                    ¿Tomas alguna medicación? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                    <button
                        className={`flex-1 py-3 rounded-lg font-bold border transition-all ${hasMedication === true ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                        onClick={() => setHasMedication(true)}
                    >
                        SÍ
                    </button>
                    <button
                        className={`flex-1 py-3 rounded-lg font-bold border transition-all ${hasMedication === false ? 'bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                        onClick={() => { setHasMedication(false); handleChange('medication', 'No aplica'); }}
                    >
                        NO
                    </button>
                </div>

                <div className={`transition-all duration-300 ${hasMedication === null ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto mt-4'}`}>
                    <label className="text-sm font-bold text-slate-700 block mb-2">
                        Detallar cuál y dosis {hasMedication && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${hasMedication === false
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200'
                            : 'bg-white border-slate-200'
                            }`}
                        rows={3}
                        placeholder="Nombre del medicamento, dosis, frecuencia..."
                        value={hasMedication === false ? 'No aplica' : (formData['medication'] || '')}
                        onChange={(e) => handleChange('medication', e.target.value)}
                        disabled={hasMedication === false}
                    />
                    {hasMedication && !formData['medication'] && errors['medication'] && (
                        <span className="text-xs text-red-500 font-bold mt-1 block">Este campo es obligatorio si seleccionaste SÍ</span>
                    )}
                </div>
            </div>

            {/* Custom Yes/No Logic for Allergies */}
            <div className="space-y-4 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <label className="text-base font-bold text-slate-800 block">
                    ¿Tienes alergias o condiciones físicas relevantes? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                    <button
                        className={`flex-1 py-3 rounded-lg font-bold border transition-all ${hasAllergies === true ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                        onClick={() => setHasAllergies(true)}
                    >
                        SÍ
                    </button>
                    <button
                        className={`flex-1 py-3 rounded-lg font-bold border transition-all ${hasAllergies === false ? 'bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                        onClick={() => { setHasAllergies(false); handleChange('allergies', 'Perfecto estado'); }}
                    >
                        NO
                    </button>
                </div>

                <div className={`transition-all duration-300 ${hasAllergies === null ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto mt-4'}`}>
                    <label className="text-sm font-bold text-slate-700 block mb-2">
                        Detallar condición {hasAllergies && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${hasAllergies === false
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200'
                            : 'bg-white border-slate-200'
                            }`}
                        rows={3}
                        placeholder="Describe tu alergia o condición..."
                        value={hasAllergies === false ? 'Perfecto estado' : (formData['allergies'] || '')}
                        onChange={(e) => handleChange('allergies', e.target.value)}
                        disabled={hasAllergies === false}
                    />
                    {hasAllergies && !formData['allergies'] && errors['allergies'] && (
                        <span className="text-xs text-red-500 font-bold mt-1 block">Este campo es obligatorio si seleccionaste SÍ</span>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {renderSectionFields('medical')}
            </div>

            <div className="flex justify-between pt-8">
                <button type="button" onClick={prevStep} className="px-6 py-3 text-slate-500 hover:text-slate-800 font-medium transition-colors">Atrás</button>
                <button onClick={nextStep} className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold hover:bg-blue-600 transition-colors shadow-lg">Siguiente</button>
            </div>
        </div>
    );

    const renderPayment = () => (
        <div className="space-y-6 animate-fade-in-up">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Confirmación y Legales</h3>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
                <h4 className="font-bold text-slate-800 mb-3">Términos y Condiciones</h4>
                <div className="bg-white border border-slate-200 rounded-lg p-4 h-40 overflow-y-auto mb-4 text-sm text-slate-600 space-y-3 shadow-inner">
                    <p><strong>1. Compromiso:</strong> El participante se compromete a respetar los horarios y dinámicas del programa.</p>
                    <p><strong>2. Asistencia:</strong> La asistencia a todos los módulos es obligatoria para la certificación.</p>
                    <p><strong>3. Confidencialidad:</strong> Todo lo compartido dentro del espacio (presencial o virtual) es estrictamente confidencial.</p>
                    <p><strong>4. Responsabilidad:</strong> HOME no se hace responsable por objetos personales perdidos durante el evento.</p>
                    <p><strong>5. Uso de Datos:</strong> La información recolectada se utiliza únicamente para fines de organización y seguridad.</p>
                    <p><strong>6. Derecho de Imagen:</strong> Durante el evento se pueden tomar fotografías con fines promocionales.</p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input type="checkbox" required className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                    <span className="text-sm text-slate-800 font-medium">
                        He leído y acepto los términos y condiciones, y la política de privacidad.
                        <br /><span className="text-slate-500 font-normal">Declaro bajo juramento que la información proporcionada es verídica.</span>
                    </span>
                </label>
            </div>

            <div className="flex justify-between pt-8">
                <button type="button" onClick={prevStep} className="px-6 py-3 text-slate-500 hover:text-slate-800 font-medium transition-colors" disabled={isSubmitting}>Atrás</button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`px-10 py-4 bg-blue-600 text-white rounded-full font-bold transition-all shadow-xl flex items-center ${isSubmitting ? 'opacity-75 cursor-wait' : 'hover:bg-blue-700 hover:shadow-blue-600/30'}`}
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Procesando...
                        </>
                    ) : (
                        <>
                            Confirmar Inscripción
                            <CheckIcon className="ml-2 w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div className="text-center space-y-8 animate-fade-in-up py-8">
            <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-10 h-10 text-green-600" />
                </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-900">¡Estás a un paso!</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                Tu inscripción ha sido recibida correctamente. Para confirmar tu lugar, realiza el pago según tu preferencia:
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-center mt-8">
                {/* Option 1 */}
                <a
                    href="https://mpago.la/12TzA5A"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border-2 border-blue-500 hover:bg-blue-50 transition-all group"
                >
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-slate-800">Ya me pongo con esto</span>
                    <span className="text-sm text-blue-600 mt-2 font-medium">Click para pagar</span>
                </a>

                {/* Option 2 */}
                <a
                    href="https://mpago.la/12n2ESQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border-2 border-blue-500 hover:bg-blue-50 transition-all group"
                >
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-slate-800">Con tarjeta de crédito</span>
                    <span className="text-sm text-slate-600 mt-1">En 3 cuotas sin interés</span>
                </a>
            </div>

            <p className="text-sm text-slate-400 mt-8">
                Si tienes dudas con el pago, contáctanos por WhatsApp.
            </p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
                    <div
                        className={`h-full bg-blue-600 transition-all duration-500 ease-out ${currentStep === 'success' ? 'bg-green-500' : ''}`}
                        style={{
                            width: currentStep === 'intro' ? '20%' :
                                currentStep === 'personal' ? '40%' :
                                    currentStep === 'medical' ? '60%' :
                                        currentStep === 'payment' ? '80%' : '100%'
                        }}
                    ></div>
                </div>

                {/* Close Button defined previously... */}
                <div className="absolute top-6 right-6 z-10">
                    <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="sr-only">Cerrar</span>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 md:p-12">
                    {currentStep === 'intro' && renderIntro()}
                    {currentStep === 'personal' && renderPersonal()}
                    {currentStep === 'medical' && renderMedical()}
                    {currentStep === 'payment' && renderPayment()}
                    {currentStep === 'success' && renderSuccess()}
                </div>
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
