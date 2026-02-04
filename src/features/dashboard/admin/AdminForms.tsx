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
    }, [selectedFormId, activeTab, forms]);

    const fetchForms = async () => {
        setIsLoading(true);
        console.log('Fetching forms...');
        const { data, error } = await supabase.from('forms').select('*');

        if (error) {
            console.error('Error fetching forms:', error);
            alert('Error al cargar formularios: ' + error.message);
        } else if (data) {
            console.log('Forms fetched:', data);
            setForms(data);
            if (data.length > 0 && !selectedFormId) {
                setSelectedFormId(data[0].id);
            }
        }
        setIsLoading(false);
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

        if (error) {
            console.error('Error fetching submissions:', error);
        } else if (data) {
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
        <div className="space-y-8 animate-fade-in-up pb-20">
            <div className="flex justify-between items-center bg-white p-6 formal-card">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Diseño de Formularios</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuración de campos y recolección de datos</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Formulario activo:</label>
                    <select
                        className="bg-slate-50 border border-slate-200 rounded-sm px-4 py-2 font-bold text-xs text-slate-600 outline-none focus:ring-1 focus:ring-blue-400"
                        value={selectedFormId || ''}
                        onChange={e => setSelectedFormId(e.target.value)}
                    >
                        {forms.map(f => (
                            <option key={f.id} value={f.id}>{f.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="formal-card overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 flex">
                    <button
                        onClick={() => setActiveTab('editor')}
                        className={`px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'editor' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Estructura de CAMPOS
                    </button>
                    <button
                        onClick={() => setActiveTab('submissions')}
                        className={`px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'submissions' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Respuestas ({activeTab === 'submissions' ? formSubmissions.length : '...'})
                    </button>
                </div>

                <div className="p-10 bg-white">
                    {activeTab === 'editor' ? (
                        <div>
                            <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-50">
                                <h3 className="text-sm font-bold text-slate-800">
                                    {selectedForm ? `Editar: ${selectedForm.title.toUpperCase()}` : 'Cargando...'}
                                </h3>
                                <button onClick={handleAddField} disabled={!selectedForm} className="px-6 py-2 bg-blue-600 text-white rounded-sm font-bold text-[10px] uppercase tracking-widest disabled:opacity-30 shadow-lg shadow-blue-500/10">
                                    + Agregar Pregunta
                                </button>
                            </div>

                            {forms.length === 0 && !isLoading && (
                                <div className="p-20 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-sm">
                                    <p className="text-slate-400 font-bold text-sm">No se encontraron definiciones de formularios.</p>
                                    <p className="text-[10px] font-bold text-slate-300 uppercase mt-4">Verificar conectividad con Supabase</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                {formFields.map(field => (
                                    <div key={field.id} className="p-6 bg-white border border-slate-100 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-end gap-6 hover:border-blue-100 transition-colors">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pregunta / Título del campo</label>
                                                <input
                                                    type="text"
                                                    value={field.label}
                                                    onChange={(e) => {
                                                        const updated = formFields.map(f => f.id === field.id ? { ...f, label: e.target.value } : f);
                                                        setFormFields(updated);
                                                    }}
                                                    onBlur={() => handleUpdateField(field.id, { label: field.label })}
                                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Tipo de dato</label>
                                                <select
                                                    value={field.type}
                                                    onChange={(e) => handleUpdateField(field.id, { type: e.target.value as any })}
                                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                                >
                                                    <option value="text">TEXTO CORTO</option>
                                                    <option value="email">EMAIL</option>
                                                    <option value="tel">TELÉFONO</option>
                                                    <option value="textarea">TEXTO LARGO</option>
                                                    <option value="date">FECHA</option>
                                                    <option value="select">DESPLEGABLE</option>
                                                    <option value="radio">OPCIÓN ÚNICA</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Sección lógica</label>
                                                <select
                                                    value={field.section}
                                                    onChange={(e) => handleUpdateField(field.id, { section: e.target.value as any })}
                                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                                >
                                                    <option value="personal">DATOS PERSONALES</option>
                                                    <option value="medical">FICHA MÉDICA</option>
                                                    <option value="payment">INFORMACIÓN PAGO</option>
                                                    <option value="intro">INTRODUCCIÓN</option>
                                                    <option value="dreams">SUEÑOS/SUEÑOS</option>
                                                    <option value="extra">OTROS</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 min-w-[150px] justify-end">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                                                />
                                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 uppercase tracking-widest">Obligatorio</span>
                                            </label>
                                            <button onClick={() => handleDeleteField(field.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2" title="Eliminar campo">
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
                                <div className="py-20 text-center bg-slate-50/50 border border-dashed border-slate-200 flex flex-col items-center">
                                    <div className="w-12 h-12 border border-slate-100 shadow-sm rounded-full bg-white flex items-center justify-center mb-4 text-slate-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-400 font-bold text-sm">{isLoading ? 'Sincronizando...' : 'Aún no hay respuestas registradas'}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formSubmissions.map(submission => (
                                        <div key={submission.id} className="bg-white border border-slate-100 p-6 rounded-sm hover:border-blue-100 transition-all">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">ID: #{submission.id.substring(0, 8)}</span>
                                                    <div className={`text-[9px] font-bold px-3 py-1 rounded-sm uppercase tracking-widest ${submission.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                        submission.status === 'enrolled' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {submission.status === 'pending' ? 'Pendiente' :
                                                            submission.status === 'enrolled' ? 'Inscripto' : submission.status}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {new Date(submission.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                                                        {submission.data.firstName || 'S/N'} {submission.data.lastName || ''}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-1">{submission.data.email || 'Sin contacto'}</p>
                                                </div>
                                                <button className="text-[10px] font-bold text-blue-600 uppercase border border-blue-50 px-4 py-2 hover:bg-blue-50 transition-colors">
                                                    Auditar Respuesta &rarr;
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminForms;
