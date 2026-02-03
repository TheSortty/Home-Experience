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
        <div className="space-y-8 animate-fade-in-up pb-20">
            <div className="flex justify-between items-center bg-white p-6 formal-card">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Gestión de Testimonios</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Moderación y aprobación de historias de alumnos</p>
                </div>
                {loading && (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                    </div>
                )}
            </div>

            <div className="formal-card overflow-hidden bg-white">
                <div className="bg-slate-50 px-8 py-5 border-b border-slate-100">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Bandeja de Entrada / Testimonios</h3>
                </div>

                <div className="p-10 space-y-6">
                    {testimonials.length === 0 && !loading ? (
                        <div className="py-20 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-sm">
                            <p className="text-slate-400 font-bold text-sm italic">No hay testimonios pendientes de revisión.</p>
                        </div>
                    ) : (
                        testimonials.map(t => (
                            <div key={t.id} className="p-8 bg-white border border-slate-100 rounded-sm flex flex-col lg:flex-row gap-8 hover:border-blue-100 transition-all">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-4">
                                        <span className={`px-3 py-1 rounded-sm text-[9px] font-bold uppercase tracking-[0.15em] border ${t.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            t.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                'bg-red-50 text-red-600 border-red-100'
                                            }`}>
                                            {t.status === 'approved' ? 'Aprobado' : t.status === 'pending' ? 'En Revisión' : 'Oculto'}
                                        </span>
                                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                                            {t.created_at ? new Date(t.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'S/F'}
                                        </span>
                                    </div>

                                    <div className="relative pl-6 mb-6">
                                        <div className="absolute left-0 top-0 text-3xl text-slate-100 font-serif leading-none italic pointer-events-none">"</div>
                                        <p className="text-slate-700 text-sm leading-relaxed italic">
                                            {t.quote}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 border-t border-slate-50 pt-6">
                                        <div className="w-10 h-10 rounded-sm bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs overflow-hidden border border-slate-100">
                                            {t.photoUrl ? (
                                                <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                                            ) : (
                                                t.name ? t.name.charAt(0).toUpperCase() : '?'
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{t.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t.role} {t.cycle && <span className="text-blue-500/50 mx-1">•</span>} {t.cycle}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-row lg:flex-col gap-3 justify-center lg:min-w-[160px] border-t lg:border-t-0 lg:border-l border-slate-50 pt-6 lg:pt-0 lg:pl-8">
                                    {t.status !== 'approved' && (
                                        <button
                                            onClick={() => handleStatusUpdate(t.id, 'approved')}
                                            className="flex-1 py-2.5 bg-slate-900 text-white rounded-sm font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
                                        >
                                            Publicar
                                        </button>
                                    )}
                                    {t.status !== 'rejected' && (
                                        <button
                                            onClick={() => handleStatusUpdate(t.id, 'rejected')}
                                            className="flex-1 py-2.5 border border-slate-200 text-slate-500 rounded-sm font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                                        >
                                            Archivar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(t.id)}
                                        className="flex-1 py-2.5 text-red-400 hover:text-red-600 font-bold text-[10px] uppercase tracking-widest transition-all"
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
