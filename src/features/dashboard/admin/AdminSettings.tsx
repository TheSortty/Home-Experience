import React, { useState } from 'react';
import { useSiteSettings, SiteSetting } from '../../../hooks/useSiteSettings';
import toast from 'react-hot-toast';

const AdminSettings: React.FC = () => {
    const { settings, loading, error, updateSetting } = useSiteSettings();
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando configuraciones...</div>;
    if (error) return (
        <div className="p-8 text-center">
            <p className="text-red-500 font-bold mb-2">Error al cargar configuraciones</p>
            <p className="text-sm text-slate-500">{error}</p>
        </div>
    );

    const categories = ['general', 'pricing', 'contact', 'links'];

    const handleEditClick = (setting: SiteSetting) => {
        setEditingKey(setting.key);
        setEditValue(setting.value);
    };

    const handleSave = async (key: string) => {
        setIsSaving(true);
        try {
            await updateSetting(key, editValue);
            toast.success('Configuración guardada exitosamente');
            setEditingKey(null);
        } catch (err) {
            toast.error('Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            <div className="flex justify-between items-center bg-white p-6 formal-card">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Preferencias del Sistema</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Parámetros globales de la plataforma</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {categories.map(category => {
                    const categorySettings = settings.filter(s => s.category === category);
                    if (categorySettings.length === 0) return null;

                    return (
                        <div key={category} className="formal-card overflow-hidden bg-white">
                            <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                    {category === 'links' ? 'CONEXIONES Y PAGOS' :
                                        category === 'pricing' ? 'ESTRUCTURA DE COSTOS' :
                                            category === 'contact' ? 'CANALES DE ATENCIÓN' : category.toUpperCase()}
                                </h3>
                                <div className="h-1 w-12 bg-slate-200 rounded-full"></div>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {categorySettings.map(setting => (
                                    <div key={setting.key} className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex-1 max-w-2xl">
                                            <h4 className="font-bold text-slate-800 text-sm tracking-tight">{setting.label}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 mb-4">{setting.description}</p>

                                            {editingKey === setting.key ? (
                                                <div className="flex gap-4 animate-fade-in">
                                                    <input
                                                        type={setting.input_type === 'number' ? 'number' : 'text'}
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="flex-1 bg-white border border-blue-200 rounded-sm px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-400 shadow-sm"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleSave(setting.key)}
                                                            disabled={isSaving}
                                                            className="bg-slate-900 text-white px-6 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all disabled:opacity-30"
                                                        >
                                                            {isSaving ? '...' : 'Sincronizar'}
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingKey(null)}
                                                            className="text-slate-400 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:text-slate-600"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => handleEditClick(setting)}>
                                                    <div className="flex-1">
                                                        <span className={`text-sm font-bold block truncate ${category === 'links' ? 'text-blue-600' : 'text-slate-600'}`}>
                                                            {setting.input_type === 'number' && category === 'pricing' ? `$${Number(setting.value).toLocaleString()}` : setting.value}
                                                        </span>
                                                    </div>
                                                    <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 border border-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-sm bg-blue-50/30 transition-all">
                                                        Modificar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminSettings;
