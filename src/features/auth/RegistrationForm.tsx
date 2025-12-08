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

        // Final Validation Check for Payment Section (Checkbox)
        // Usually handled by broweser 'required' attribute on checkbox, but let's be safe.

        console.log('Enviando a Supabase...', formData);

        try {
            const { data, error } = await supabase
                .from('registrations')
                .insert([
                    {
                        data: formData,
                        status: 'PENDING_REVIEW'
                    }
                ]);

            if (error) {
                console.error('Error de Supabase:', error);
                alert('Error al guardar: ' + error.message);
            } else {
                console.log('¡Éxito!', data);
                setCurrentStep('success');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            console.error('Error inesperado:', err);
            alert('Ocurrió un error inesperado. Intenta de nuevo.');
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
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Confirmación</h3>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" required className="mt-1 w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm text-slate-600 leading-relaxed">
                        He leído y acepto los <button type="button" onClick={() => setShowTerms(true)} className="text-blue-600 hover:underline font-bold">Términos y Condiciones</button> y la <button type="button" onClick={() => setShowPrivacy(true)} className="text-blue-600 hover:underline font-bold">Política de Privacidad</button>.
                        <br />Declaro bajo juramento que la información proporcionada es verídica y asumo la total responsabilidad por mi participación en el programa, liberando a HOME de cualquier responsabilidad por datos omitidos o falsos.
                    </span>
                </label>
            </div>

            <div className="flex justify-between pt-8">
                <button type="button" onClick={prevStep} className="px-6 py-3 text-slate-500 hover:text-slate-800 font-medium transition-colors">Atrás</button>
                <button onClick={handleSubmit} className="px-10 py-4 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-600/30 flex items-center">
                    Confirmar Inscripción
                    <CheckIcon className="ml-2 w-5 h-5" />
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

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left mt-8">
                {/* Option A: Cash/Transfer */}
                <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-green-500 hover:shadow-xl transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        MEJOR PRECIO
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">OPCIÓN A</h3>
                    <h4 className="text-lg font-bold text-slate-800 mb-4 text-center">Transferencia o Depósito</h4>
                    <p className="text-center text-sm text-green-600 font-medium mb-6">
                        Aprovecha los descuentos especiales pagando por este medio.
                    </p>

                    <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm text-slate-700 space-y-2 mb-6 border border-slate-100">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Alias:</span>
                            <span className="font-bold select-all">homedh.mp</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Titular:</span>
                            <span className="font-bold text-right">Mariano Hernán Corigliano</span>
                        </div>
                    </div>

                    <a
                        href={`https://wa.me/5493516518774?text=${encodeURIComponent(`Hola! Ya completé mi inscripción. Aquí envío el comprobante de transferencia para confirmar mi lugar.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-4 bg-green-600 text-white text-center rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                    >
                        Enviar Comprobante <span className="ml-2">→</span>
                    </a>
                </div>

                {/* Option B: Credit Card */}
                <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">OPCIÓN B</h3>
                    <h4 className="text-lg font-bold text-slate-800 mb-6 text-center">Tarjeta de Crédito</h4>

                    <div className="space-y-6">
                        {/* Combos */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Combos (Paquetes)</p>
                            <div className="space-y-3">
                                <a href="#" target="_blank" rel="noopener noreferrer" className="block w-full py-3 px-4 border-2 border-blue-100 text-blue-600 rounded-xl font-bold hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
                                    Pagar COMBO 1 <span className="text-sm font-normal text-slate-500 block">$480.000 (Incluye Inicial + Avanzado)</span>
                                </a>
                                <a href="#" target="_blank" rel="noopener noreferrer" className="block w-full py-3 px-4 border-2 border-blue-100 text-blue-600 rounded-xl font-bold hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
                                    Pagar COMBO 2 <span className="text-sm font-normal text-slate-500 block">$740.000 (Programa Completo)</span>
                                </a>
                            </div>
                        </div>

                        {/* Individual Stages */}
                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Etapas Individuales</p>
                            <div className="space-y-3">
                                <a href="#" target="_blank" rel="noopener noreferrer" className="block w-full py-2 px-4 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:border-blue-400 hover:text-blue-600 transition-all text-center">
                                    Etapa INICIAL <span className="ml-1 text-slate-400 font-normal">($190.000)</span>
                                </a>
                                <a href="#" target="_blank" rel="noopener noreferrer" className="block w-full py-2 px-4 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:border-blue-400 hover:text-blue-600 transition-all text-center">
                                    Etapa AVANZADO <span className="ml-1 text-slate-400 font-normal">($230.000)</span>
                                </a>
                                <a href="#" target="_blank" rel="noopener noreferrer" className="block w-full py-2 px-4 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:border-blue-400 hover:text-blue-600 transition-all text-center">
                                    Etapa LIDERAZGO <span className="ml-1 text-slate-400 font-normal">($350.000)</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
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
