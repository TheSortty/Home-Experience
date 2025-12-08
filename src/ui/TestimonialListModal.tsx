import React, { useState, useMemo } from 'react';
import { MockDatabase } from '../services/mockDatabase';
import { Testimonial, TestimonialRole } from '../core/types';
import StarIcon from './icons/StarIcon';

interface TestimonialListModalProps {
    isVisible: boolean;
    onClose: () => void;
    onTestimonialClick: (testimonial: Testimonial) => void;
}

const TestimonialListModal: React.FC<TestimonialListModalProps> = ({ isVisible, onClose, onTestimonialClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState<TestimonialRole | 'All'>('All');

    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

    React.useEffect(() => {
        const allTestimonials = MockDatabase.getTestimonials();
        const approved = allTestimonials.filter(t => t.status === 'approved');
        setTestimonials(approved);
    }, [isVisible]);

    const filteredTestimonials = useMemo(() => {
        return testimonials.filter(t => {
            const matchesSearch = t.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.quote.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = selectedRole === 'All' || t.roles.includes(selectedRole);
            return matchesSearch && matchesRole;
        });
    }, [searchTerm, selectedRole, testimonials]);

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-fade-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                    <div>
                        <h2 className="font-serif text-3xl md:text-4xl font-bold text-slate-900">Historias de la Comunidad</h2>
                        <p className="text-slate-500 mt-2">Explora las experiencias de quienes ya han recorrido el camino.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o palabra clave..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        {(['All', 'Participante', 'Senior', 'Staff'] as const).map(role => (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${selectedRole === role
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                {role === 'All' ? 'Todos' : role}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
                    {filteredTestimonials.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTestimonials.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => onTestimonialClick(t)}
                                    className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
                                >
                                    <div className="flex gap-1 mb-3">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <StarIcon key={i} className="w-3 h-3 text-amber-400" />
                                        ))}
                                    </div>
                                    <p className="text-slate-700 text-sm leading-relaxed mb-4 flex-1 italic">"{t.quote.substring(0, 150)}{t.quote.length > 150 ? '...' : ''}"</p>
                                    <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                            {t.author.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">{t.author}</h4>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t.roles.join(', ')}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <p className="text-lg">No se encontraron testimonios.</p>
                            <button onClick={() => { setSearchTerm(''); setSelectedRole('All'); }} className="mt-2 text-blue-600 hover:underline">
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestimonialListModal;
