import React, { useState } from 'react';
import { useSiteSettings, SiteSetting } from '../../../hooks/useSiteSettings';

const AdminSettings: React.FC = () => {
    const { settings, loading, updateSetting } = useSiteSettings();
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando configuraciones...</div>;

    const categories = ['general', 'pricing', 'contact', 'links'];

    const handleEditClick = (setting: SiteSetting) => {
        setEditingKey(setting.key);
        setEditValue(setting.value);
    };

    const handleSave = async (key: string) => {
        setIsSaving(true);
        try {
            await updateSetting(key, editValue);
            setEditingKey(null);
        } catch (err) {
            alert('Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Configuración Global</h2>
                    <p className="text-slate-500">Gestiona precios, links y datos de contacto de toda la web desde aquí.</p>
                </div>
            </div>

            {categories.map(category => {
                const categorySettings = settings.filter(s => s.category === category);
                if (categorySettings.length === 0) return null;

                return (
                    <div key={category} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 capitalize">{category === 'links' ? 'Links de Pago' : category === 'pricing' ? 'Precios' : category}</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {categorySettings.map(setting => (
                                <div key={setting.key} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 text-sm">{setting.label}</h4>
                                        <p className="text-xs text-slate-500 mb-2">{setting.description}</p>

                                        {editingKey === setting.key ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type={setting.input_type === 'number' ? 'number' : 'text'}
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleSave(setting.key)}
                                                    disabled={isSaving}
                                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {isSaving ? '...' : 'Guardar'}
                                                </button>
                                                <button
                                                    onClick={() => setEditingKey(null)}
                                                    className="text-slate-500 px-3 py-2 text-sm hover:bg-slate-100 rounded-lg"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleEditClick(setting)}>
                                                <span className={`text-base font-medium truncate max-w-md ${category === 'links' ? 'text-blue-600 underline' : 'text-slate-700'}`}>
                                                    {setting.input_type === 'number' && category === 'pricing' ? `$${Number(setting.value).toLocaleString()}` : setting.value}
                                                </span>
                                                <span className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded transition-opacity">
                                                    Editar
                                                </span>
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
    );
};

export default AdminSettings;
