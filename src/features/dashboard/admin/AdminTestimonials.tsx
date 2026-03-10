import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Testimonial } from '../../../core/types';
import TrashIcon from '../../../ui/icons/TrashIcon';
import { createPortal } from 'react-dom';

const AdminTestimonials: React.FC = () => {
    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    const [trashCount, setTrashCount] = useState(0);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [testimonialToDelete, setTestimonialToDelete] = useState<any | null>(null);

    const fetchTestimonials = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('testimonials')
            .select('*')
            .eq('is_deleted', viewMode === 'trash')
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
        fetchTrashCount();
    };

    const fetchTrashCount = async () => {
        const { count, error } = await supabase
            .from('testimonials')
            .select('*', { count: 'exact', head: true })
            .eq('is_deleted', true);

        if (!error && count !== null) {
            setTrashCount(count);
        }
    };

    useEffect(() => {
        fetchTestimonials();
        fetchTrashCount();
    }, [viewMode]);

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

    const handleSoftDelete = async (id: string | number) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('testimonials')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: user?.id || null
            })
            .eq('id', id);

        if (error) {
            console.error('Error deleting:', error);
            alert('Error al mover a la papelera');
        } else {
            fetchTestimonials();
        }
    };

    const handleRestore = async (id: string | number) => {
        const { error } = await supabase
            .from('testimonials')
            .update({
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            })
            .eq('id', id);

        if (error) {
            alert('Error al restaurar');
        } else {
            fetchTestimonials();
        }
    };

    const handlePermanentDelete = async () => {
        if (!testimonialToDelete) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            alert('No tienes permisos suficientes (Admin) para eliminar permanentemente.');
            return;
        }

        const { error } = await supabase
            .from('testimonials')
            .delete()
            .eq('id', testimonialToDelete.id);

        if (error) {
            alert('Error al eliminar definitivamente');
        } else {
            setIsConfirmDeleteOpen(false);
            setTestimonialToDelete(null);
            fetchTestimonials();
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
                <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        {viewMode === 'active' ? 'Bandeja de Entrada / Testimonios' : 'Papelera / Testimonios'}
                    </h3>
                    <div className="flex items-center gap-4">
                        {viewMode === 'active' && (
                            <button
                                onClick={() => setViewMode('trash')}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors relative"
                                title="Ver Papelera"
                            >
                                <TrashIcon className="w-4 h-4" />
                                {trashCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                                        {trashCount}
                                    </span>
                                )}
                            </button>
                        )}
                        {viewMode === 'trash' && (
                            <button
                                onClick={() => setViewMode('active')}
                                className="px-3 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-sm transition-colors uppercase tracking-wider"
                            >
                                Volver a Activos
                            </button>
                        )}
                    </div>
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
                                    {viewMode === 'active' ? (
                                        <button
                                            onClick={() => handleSoftDelete(t.id)}
                                            className="flex-1 py-2.5 text-red-400 hover:text-red-600 font-bold text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            Eliminar
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleRestore(t.id)}
                                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-sm font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                                            >
                                                Restaurar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setTestimonialToDelete(t);
                                                    setIsConfirmDeleteOpen(true);
                                                }}
                                                className="flex-1 py-2.5 text-red-600 hover:text-red-800 font-bold text-[10px] uppercase tracking-widest transition-all"
                                            >
                                                Eliminar Definitivamente
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {/* Confirm Permanent Delete Modal */}
            {isConfirmDeleteOpen && testimonialToDelete && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setIsConfirmDeleteOpen(false)}>
                    <div className="formal-modal max-w-md w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                                <TrashIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar testimonio definitivamente?</h3>
                            <p className="text-sm text-slate-500 mb-8">
                                Estás a punto de borrar permanentemente el testimonio de <strong>{testimonialToDelete.name}</strong>. Esta acción no se puede deshacer.
                            </p>
                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setIsConfirmDeleteOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-slate-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handlePermanentDelete}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
                                >
                                    Eliminar Ahora
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AdminTestimonials;
