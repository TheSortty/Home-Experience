import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabaseClient';
import CheckIcon from '../../ui/icons/CheckIcon';
import StarRatingInput from '../../ui/inputs/StarRatingInput';

interface TestimonialFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ROLES_ORDER = ['Inicial', 'Avanzado', 'PL', 'Staff', 'Senior'];

const RoleStepper = ({ currentRole, onChange }: { currentRole: string, onChange: (r: string) => void }) => {
    const currentIndex = ROLES_ORDER.indexOf(currentRole);

    return (
        <div className="w-full mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-4 text-center">
                ¿Hasta dónde llegaste?
            </label>
            <div className="relative flex items-center justify-between w-full px-2">
                {/* Background Line */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full -z-10" />

                {/* Active Progress Line */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full -z-10 transition-all duration-300"
                    style={{ width: `${(currentIndex / (ROLES_ORDER.length - 1)) * 100}%` }}
                />

                {ROLES_ORDER.map((role, index) => {
                    const isActive = index <= currentIndex;
                    const isSelected = index === currentIndex;

                    return (
                        <div key={role} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => onChange(role)}>
                            <div className={`
                                w-4 h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center
                                ${isActive ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300 group-hover:border-blue-300'}
                                ${isSelected ? 'ring-4 ring-blue-100 scale-125' : ''}
                            `}>
                                {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                {role}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface ExtraCamada {
    id: string;
    number: string;
    name: string;
}

const TestimonialFormModal: React.FC<TestimonialFormModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        program: 'CRESER',
        name: '',
        role: 'Inicial',
        camada: '', // Main numeric
        camadaName: '', // Main name
        plName: '',
        enrolledBy: '',
        hasMultiplePL: false,
        message: '',
        rating: 5
    });

    const [extraPls, setExtraPls] = useState<ExtraCamada[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // STRONG Lock body/html scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden'; // Lock html as well
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Reset Multiple PL if not Senior
    useEffect(() => {
        if (formData.role !== 'Senior') {
            setFormData(prev => ({ ...prev, hasMultiplePL: false }));
            setExtraPls([]);
        }
    }, [formData.role]);

    if (!isOpen) return null;

    const isHigherRole = ['PL', 'Staff', 'Senior'].includes(formData.role);
    const isParticipant = ['Inicial', 'Avanzado'].includes(formData.role);
    const isSenior = formData.role === 'Senior';

    // Logic to handle Extra PLs
    const handleAddExtraPl = () => {
        setExtraPls(prev => [...prev, { id: crypto.randomUUID(), number: '', name: '' }]);
    };

    const handleRemoveExtraPl = (id: string) => {
        setExtraPls(prev => prev.filter(p => p.id !== id));
    };

    const handleUpdateExtraPl = (id: string, field: 'number' | 'name', value: string) => {
        setExtraPls(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const toggleMultiplePL = (checked: boolean) => {
        handleChange('hasMultiplePL', checked);
        if (checked && extraPls.length === 0) {
            handleAddExtraPl(); // Auto-add first extra slot
        } else if (!checked) {
            setExtraPls([]); // Clear if unchecked
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Combine main PL + Extra PLs for storage
            let finalCamada = formData.camada;
            let finalCamadaName = formData.camadaName;

            if (formData.hasMultiplePL && extraPls.length > 0) {
                const extraNumbers = extraPls.map(p => p.number).filter(Boolean).join(', ');
                const extraNames = extraPls.map(p => p.name).filter(Boolean).join(', ');

                if (extraNumbers) finalCamada = `${finalCamada}, ${extraNumbers}`;
                if (extraNames) finalCamadaName = `${finalCamadaName}, ${extraNames}`;
            }

            const payload = {
                author_name: formData.name,
                quote: formData.message,
                roles: [formData.role],
                program: formData.program,
                rating: formData.rating,
                // New Fields
                camada: isHigherRole ? finalCamada : null,
                camada_name: isHigherRole ? finalCamadaName : null,
                pl_name: isParticipant ? formData.plName : null,
                enrolled_by: formData.enrolledBy,
                has_multiple_pl: isHigherRole ? formData.hasMultiplePL : false,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            const { error: insertError } = await supabase
                .from('testimonials')
                .insert([payload]);

            if (insertError) throw insertError;

            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                setFormData({
                    program: 'CRESER',
                    name: '',
                    role: 'Inicial',
                    camada: '',
                    camadaName: '',
                    plName: '',
                    enrolledBy: '',
                    hasMultiplePL: false,
                    message: '',
                    rating: 5
                });
                setExtraPls([]);
            }, 3000);

        } catch (err: any) {
            console.error('Error submitting testimonial:', err);
            setError('Hubo un problema al enviar tu historia. Por favor intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const PROGRAMS = ['CRESER'];

    // Using Portal with a robust scroll container
    return createPortal(
        <div className="fixed inset-0 z-[99999]" style={{ zIndex: 99999 }}>
            {/* 1. Backdrop */}
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            {/* 2. Scroll Container (This handles the scroll) */}
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                <div className="flex min-h-full items-center justify-center p-4">

                    {/* 3. Modal Card - ULTRA WIDE (max-w-6xl) */}
                    <div
                        className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl relative animate-up-scale z-10 flex flex-col my-8"
                        onClick={e => e.stopPropagation()} // Prevent closing when clicking card
                    >

                        {/* Header (Sticky) */}
                        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-20 rounded-t-3xl">
                            <div>
                                <h3 className="text-2xl md:text-3xl font-serif font-bold text-slate-900">Tu Historia</h3>
                                <p className="text-slate-500 text-sm mt-1">Compartí tu experiencia y sé parte del cambio.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 md:p-8 lg:p-10">
                            {isSuccess ? (
                                <div className="py-20 text-center flex flex-col items-center">
                                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-green-50 animate-bounce-short">
                                        <CheckIcon className="w-12 h-12 text-green-600" />
                                    </div>
                                    <h3 className="text-3xl font-serif font-bold text-slate-900 mb-3">¡Gracias!</h3>
                                    <p className="text-slate-600 text-lg">Tu historia inspira a nuestra comunidad.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="">

                                    {/* 3-COLUMN HORIZONTAL LAYOUT */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* LEFT COLUMN: Basic Info + Stepper */}
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Programa</label>
                                                    <select
                                                        className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                                                        value={formData.program}
                                                        onChange={(e) => handleChange('program', e.target.value)}
                                                    >
                                                        {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Nombre Completo</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={formData.name}
                                                        onChange={(e) => handleChange('name', e.target.value)}
                                                        className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-medium"
                                                        placeholder="Ej. María González"
                                                    />
                                                </div>
                                            </div>

                                            {/* Stepper */}
                                            <div className="pt-2">
                                                <RoleStepper currentRole={formData.role} onChange={(r) => handleChange('role', r)} />
                                            </div>
                                        </div>

                                        {/* CENTER COLUMN: Role-specific Fields */}
                                        <div className="space-y-6">
                                            {/* PL Info */}
                                            {isHigherRole && (
                                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 animate-fade-in relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                                    <h4 className="font-bold text-slate-900 text-sm mb-3">Información de PL</h4>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1">Camada N°</label>
                                                            <input
                                                                type="number"
                                                                required
                                                                value={formData.camada}
                                                                onChange={(e) => handleChange('camada', e.target.value)}
                                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-blue-500 text-sm"
                                                                placeholder="Ej. 27"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1">Nombre Camada</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={formData.camadaName}
                                                                onChange={(e) => handleChange('camadaName', e.target.value)}
                                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-blue-500 text-sm"
                                                                placeholder="Ej. Guerreros"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Multiple PL Toggle - SENIOR ONLY */}
                                                    {isSenior && (
                                                        <div className="animate-fade-in mt-2">
                                                            <label className="flex items-center gap-2 cursor-pointer group mb-3">
                                                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${formData.hasMultiplePL ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                                                                    {formData.hasMultiplePL && <CheckIcon className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={formData.hasMultiplePL}
                                                                    onChange={(e) => toggleMultiplePL(e.target.checked)}
                                                                />
                                                                <span className="text-xs text-slate-700 font-bold">¿Hiciste más de 1 PL?</span>
                                                            </label>

                                                            {/* Extra PLs List */}
                                                            {formData.hasMultiplePL && (
                                                                <div className="space-y-2 pt-2 pl-3 border-l-2 border-slate-200">
                                                                    {extraPls.map((extra, idx) => (
                                                                        <div key={extra.id} className="animate-fade-in grid grid-cols-12 gap-2 items-end">
                                                                            <div className="col-span-4">
                                                                                <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">N°</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={extra.number}
                                                                                    onChange={(e) => handleUpdateExtraPl(extra.id, 'number', e.target.value)}
                                                                                    className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                                                                                    placeholder="32"
                                                                                />
                                                                            </div>
                                                                            <div className="col-span-6">
                                                                                <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Nombre</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={extra.name}
                                                                                    onChange={(e) => handleUpdateExtraPl(extra.id, 'name', e.target.value)}
                                                                                    className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                                                                                    placeholder="Nombre..."
                                                                                />
                                                                            </div>
                                                                            <div className="col-span-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveExtraPl(extra.id)}
                                                                                    className="w-full h-[30px] flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                                                                >
                                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleAddExtraPl}
                                                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                                                    >
                                                                        + Agregar otro PL
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Participant Field */}
                                            {isParticipant && (
                                                <div className="animate-fade-in bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Nombre de tu PL</label>
                                                    <input
                                                        type="text"
                                                        value={formData.plName}
                                                        onChange={(e) => handleChange('plName', e.target.value)}
                                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-blue-500 text-sm"
                                                        placeholder="Ej. Juan Pérez"
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">¿Quién te enroló?</label>
                                                <input
                                                    type="text"
                                                    value={formData.enrolledBy}
                                                    onChange={(e) => handleChange('enrolledBy', e.target.value)}
                                                    className="w-full p-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                                                    placeholder="Nombre de quien te invitó"
                                                />
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN: Experience + Rating + Submit */}
                                        <div className="space-y-5">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Tu Experiencia</label>
                                                <textarea
                                                    required
                                                    rows={6}
                                                    value={formData.message}
                                                    onChange={(e) => handleChange('message', e.target.value)}
                                                    className="w-full p-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none text-sm leading-relaxed"
                                                    placeholder="Contanos qué significó para vos..."
                                                />
                                            </div>

                                            <div className="flex flex-col items-center gap-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calificación</label>
                                                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                                    <StarRatingInput
                                                        value={formData.rating}
                                                        onChange={(val) => handleChange('rating', val)}
                                                    />
                                                </div>
                                            </div>

                                            {error && (
                                                <p className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-xl font-bold animate-shake">{error}</p>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-900/30 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center transform hover:-translate-y-1"
                                            >
                                                {isSubmitting ? (
                                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    'Enviar Historia'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TestimonialFormModal;
