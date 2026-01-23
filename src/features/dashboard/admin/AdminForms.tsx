import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { FormField, FormSubmission } from '../../../services/mockDatabase'; // Keeping types or redefining them? Let's use simplified types here.

// Simplified types matching DB JSON structure
interface Form {
    id: string;
    slug: string;
    title: string;
    schema: FormField[];
}

const AdminForms: React.FC = () => {
    const [forms, setForms] = useState<Form[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [formSubmissions, setFormSubmissions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'editor' | 'submissions'>('editor');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchForms();
    }, []);

    useEffect(() => {
        if (selectedFormId) {
            fetchFormFields(selectedFormId);
            if (activeTab === 'submissions') {
                fetchSubmissions(selectedFormId);
            }
        }
    }, [selectedFormId, activeTab]);

    const fetchForms = async () => {
        const { data, error } = await supabase.from('forms').select('*');
        if (data) {
            setForms(data);
            if (data.length > 0 && !selectedFormId) {
                setSelectedFormId(data[0].id);
            }
        }
    };

    const fetchFormFields = async (formId: string) => {
        const form = forms.find(f => f.id === formId);
        if (form) {
            // Ensure schema is parsed if it comes as string, though Supabase client usually parses JSONB
            setFormFields(typeof form.schema === 'string' ? JSON.parse(form.schema) : form.schema);
        }
    };

    const fetchSubmissions = async (formId: string) => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('form_submissions')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: false });

        if (data) {
            setFormSubmissions(data);
        }
        setIsLoading(false);
    };

    const saveFormSchema = async (newSchema: FormField[]) => {
        if (!selectedFormId) return;
        const { error } = await supabase
            .from('forms')
            .update({ schema: newSchema })
            .eq('id', selectedFormId);

        if (error) {
            alert('Error guardando formulario');
        } else {
            // Update local state
            setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, schema: newSchema } : f));
        }
    };

    const handleAddField = () => {
        const newField: FormField = {
            id: `field_${Date.now()}`,
            type: 'text',
            label: 'Nueva Pregunta',
            required: false,
            section: 'personal'
        };
        const updated = [...formFields, newField];
        setFormFields(updated);
        saveFormSchema(updated);
    };

    const handleDeleteField = (id: string) => {
        const updated = formFields.filter(f => f.id !== id);
        setFormFields(updated);
        saveFormSchema(updated);
    };

    const handleUpdateField = (id: string, updates: Partial<FormField>) => {
        const updated = formFields.map(f => f.id === id ? { ...f, ...updates } : f);
        setFormFields(updated);
        // Debounce save or save immediately? Saving immediately for now (simple)
        saveFormSchema(updated);
    };

    const selectedForm = forms.find(f => f.id === selectedFormId);

    return (
        <div className="space-y-6 animate-fade-in-up pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gestión de Formularios</h2>
                    <p className="text-slate-500">Edita las preguntas de inscripción y revisa las respuestas.</p>
                </div>
                <div>
                    <select
                        className="bg-white border border-slate-300 rounded-lg px-4 py-2 font-bold text-sm"
                        value={selectedFormId || ''}
                        onChange={e => setSelectedFormId(e.target.value)}
                    >
                        {forms.map(f => (
                            <option key={f.id} value={f.id}>{f.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 flex">
                    <button
                        onClick={() => setActiveTab('editor')}
                        className={`px-6 py-4 font-bold transition-colors ${activeTab === 'editor' ? 'bg-white text-slate-900 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500'}`}
                    >
                        Editor de Campos
                    </button>
                    <button
                        onClick={() => setActiveTab('submissions')}
                        className={`px-6 py-4 font-bold transition-colors ${activeTab === 'submissions' ? 'bg-white text-slate-900 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500'}`}
                    >
                        Respuestas ({activeTab === 'submissions' ? formSubmissions.length : '...'})
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'editor' ? (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-800">Campos del Formulario "{selectedForm?.title}"</h3>
                                <button onClick={handleAddField} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm">
                                    + Agregar Campo
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formFields.map(field => (
                                    <div key={field.id} className="bg-slate-50 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-100">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 mb-1 block">Etiqueta (Pregunta)</label>
                                                <input
                                                    type="text"
                                                    value={field.label}
                                                    onChange={(e) => {
                                                        const updated = formFields.map(f => f.id === field.id ? { ...f, label: e.target.value } : f);
                                                        setFormFields(updated); // Local update for speed
                                                    }}
                                                    onBlur={() => handleUpdateField(field.id, { label: field.label })} // Save on blur
                                                    className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 mb-1 block">Tipo de Respuesta</label>
                                                <select
                                                    value={field.type}
                                                    onChange={(e) => handleUpdateField(field.id, { type: e.target.value as any })}
                                                    className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="text">Texto Corto</option>
                                                    <option value="email">Email</option>
                                                    <option value="tel">Teléfono</option>
                                                    <option value="textarea">Texto Largo</option>
                                                    <option value="date">Fecha</option>
                                                    <option value="select">Desplegable</option>
                                                    <option value="radio">Radio</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 mb-1 block">Sección</label>
                                                <select
                                                    value={field.section}
                                                    onChange={(e) => handleUpdateField(field.id, { section: e.target.value as any })}
                                                    className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="personal">Datos Personales</option>
                                                    <option value="medical">Ficha Médica</option>
                                                    <option value="payment">Info Pago</option>
                                                    <option value="intro">Intro / Motivación</option>
                                                    <option value="dreams">Sueños</option>
                                                    <option value="extra">Más de Vos</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-xs font-bold text-slate-500">Obligatorio</span>
                                            </label>
                                            <button onClick={() => handleDeleteField(field.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar campo">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {formSubmissions.length === 0 ? (
                                <p className="text-slate-400 italic text-center py-8">{isLoading ? 'Cargando...' : 'No hay respuestas aún.'}</p>
                            ) : (
                                formSubmissions.map(submission => (
                                    <div key={submission.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-700">#{submission.id.substring(0, 6)}</span>
                                                <div className={`text-xs px-2 py-0.5 rounded-full font-bold ${submission.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    submission.status === 'enrolled' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200'
                                                    }`}>
                                                    {submission.status.toUpperCase()}
                                                </div>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(submission.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <button className="text-xs font-bold text-blue-600 hover:underline">Ver Detalle</button>
                                        </div>
                                        <div className="text-sm text-slate-700">
                                            <strong>{submission.data.firstName || 'Sin nombre'} {submission.data.lastName || ''}</strong>
                                            <span className="mx-2 text-slate-300">|</span>
                                            {submission.data.email || 'Sin email'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminForms;
