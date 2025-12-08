import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Testimonial } from '../../../core/types';

const AdminTestimonials: React.FC = () => {
    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchTestimonials = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('testimonials')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) {
            const mappedData = data.map((t: any) => ({
                id: t.id,
                name: t.author_name, // DB -> Admin UI
                quote: t.quote,
                role: Array.isArray(t.roles) ? t.roles.join(', ') : t.roles || '', // Handle array or string safely
                cycle: t.cycle_text,
                status: t.status,
                created_at: t.created_at,
                photoUrl: t.photo_url
            }));
            setTestimonials(mappedData);
        }
        if (error) console.error('Error:', error);
        setLoading(false);
    };

    useEffect(() => {
        fetchTestimonials();
    }, []);

    const handleStatusUpdate = async (id: string | number, status: Testimonial['status']) => {
        const { error } = await supabase
            .from('testimonials')
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar el estado');
        } else {
            fetchTestimonials();
        }
    };

    const handleDelete = async (id: string | number) => {
        if (confirm('¿Estás seguro de eliminar este testimonio?')) {
            const { error } = await supabase
                .from('testimonials')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting:', error);
                alert('Error al eliminar el testimonio');
            } else {
                fetchTestimonials();
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white/80 border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Moderación de Testimonios</h3>
                    {loading && <span className="text-sm text-slate-500">Cargando...</span>}
                </div>

                <div className="space-y-4">
                    {testimonials.length === 0 && !loading ? (
                        <p className="text-slate-500 text-center py-8">No hay testimonios aún.</p>
                    ) : (
                        testimonials.map(t => (
                            <div key={t.id} className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${t.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            t.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {t.status === 'approved' ? 'Aprobado' : t.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                                        </span>
                                        <span className="text-slate-400 text-xs">{t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Fecha desc.'}</span>
                                    </div>
                                    <p className="text-slate-800 italic mb-4">"{t.quote}"</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden">
                                            {t.photoUrl ? (
                                                <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                                            ) : (
                                                t.name ? t.name.charAt(0) : '?'
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{t.name}</p>
                                            <p className="text-xs text-slate-500">{t.role} {t.cycle && `• ${t.cycle}`}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-row md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                                    {t.status !== 'approved' && (
                                        <button
                                            onClick={() => handleStatusUpdate(t.id, 'approved')}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors"
                                        >
                                            Aprobar
                                        </button>
                                    )}
                                    {t.status !== 'rejected' && (
                                        <button
                                            onClick={() => handleStatusUpdate(t.id, 'rejected')}
                                            className="px-4 py-2 bg-slate-600 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition-colors"
                                        >
                                            Rechazar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(t.id)}
                                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold text-sm hover:bg-red-200 transition-colors"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminTestimonials;
