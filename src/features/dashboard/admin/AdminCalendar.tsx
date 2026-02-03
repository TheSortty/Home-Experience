import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../services/supabaseClient';
import UsersIcon from '../../../ui/icons/UsersIcon';
import TrashIcon from '../../../ui/icons/TrashIcon';
import CheckIcon from '../../../ui/icons/CheckIcon';

export interface Cycle {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: 'active' | 'finished';
    type: 'initial' | 'advanced' | 'plan_lider';
    capacity: number;
    enrolled_count: number;
}

interface Enrollment {
    id: string;
    user: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    };
    attendance: boolean[];
}

const AdminCalendar: React.FC = () => {
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
    const [cycleStudents, setCycleStudents] = useState<Enrollment[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);

    useEffect(() => {
        fetchCycles();
    }, []);

    const fetchCycles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cycles')
            .select('*')
            .order('start_date', { ascending: true });

        if (error) {
            console.error('Error fetching cycles:', error);
        } else {
            setCycles(data || []);
        }
        setLoading(false);
    };

    const handleCreateCycle = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        const newCycle = {
            name: formData.get('name') as string,
            start_date: formData.get('startDate') as string,
            end_date: formData.get('endDate') as string,
            type: formData.get('type') as string,
            capacity: parseInt(formData.get('capacity') as string) || 30,
            status: 'active',
            enrolled_count: 0
        };

        const { error } = await supabase
            .from('cycles')
            .insert([newCycle]);

        if (error) {
            alert('Error creating cycle: ' + error.message);
        } else {
            fetchCycles();
            setIsCreateModalOpen(false);
        }
    };

    const handleDeleteCycle = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este ciclo?')) return;

        const { error } = await supabase
            .from('cycles')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error deleting cycle: ' + error.message);
        } else {
            fetchCycles();
        }
    };

    const fetchStudentsForCycle = async (cycleId: string) => {
        setIsLoadingStudents(true);
        // We need to join with profiles. Note: 'user:profiles(...)' depends on foreign key name
        // Assuming enrollments has user_id FK to profiles(id)
        const { data, error } = await supabase
            .from('enrollments')
            .select(`
                id,
                user:profiles (
                    id,
                    first_name,
                    last_name,
                    email
                )
            `)
            .eq('cycle_id', cycleId);

        if (error) {
            console.error('Error fetching students:', error);
            setCycleStudents([]);
        } else {
            // Cast the result to shape it correctly if needed, or just use as is
            const formatted = (data as any[]).map(item => ({
                id: item.id,
                user: item.user,
                attendance: [false, false, false, false] // Placeholder for now
            }));
            setCycleStudents(formatted);
        }
        setIsLoadingStudents(false);
    };

    const filteredCycles = cycles.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getLevelColor = (type: string) => {
        switch (type) {
            case 'initial': return 'bg-blue-500';
            case 'advanced': return 'bg-purple-500';
            case 'plan_lider': return 'bg-indigo-600';
            default: return 'bg-slate-500';
        }
    };

    const formatType = (type: string) => {
        if (type === 'plan_lider') return 'PROGRAMA LIDER';
        return type.toUpperCase();
    };
    return (
        <>
            <div className="flex flex-col lg:flex-row gap-8 h-full animate-fade-in-up">
                {/* Left: Cycle List */}
                <div className="flex-1 formal-card overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Programación de Ciclos</h3>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-blue-700 transition-colors"
                        >
                            + Nuevo Ciclo
                        </button>
                    </div>

                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o tipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-sm text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                    </div>

                    <div className="overflow-y-auto p-6 space-y-4">
                        {loading ? (
                            <p className="text-center text-slate-400">Cargando ciclos...</p>
                        ) : filteredCycles.length === 0 ? (
                            <p className="text-center text-slate-400">No hay ciclos encontrados.</p>
                        ) : (
                            filteredCycles.map(cycle => (
                                <div key={cycle.id} className="bg-white border border-slate-100 rounded-sm p-4 hover:border-blue-200 transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-sm flex items-center justify-center text-white font-bold shadow-sm ${getLevelColor(cycle.type)}`}>
                                            <span className="text-lg">{new Date(cycle.start_date).getDate()}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{cycle.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{formatType(cycle.type)}</span>
                                                <span className="text-slate-300">|</span>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">{cycle.start_date}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase mb-1">
                                                <UsersIcon className="w-3 h-3 mr-1" />
                                                {cycle.enrolled_count} / {cycle.capacity}
                                            </div>
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${Math.min(100, (cycle.enrolled_count / cycle.capacity) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${cycle.status === 'finished' ? 'bg-slate-100 text-slate-500' :
                                                'bg-emerald-100 text-emerald-600'
                                                }`}>
                                                {cycle.status === 'active' ? 'Activo' : 'Finalizado'}
                                            </span>
                                            <button
                                                className="text-blue-600 text-xs font-bold uppercase hover:underline"
                                                onClick={() => {
                                                    setSelectedCycle(cycle);
                                                    fetchStudentsForCycle(cycle.id);
                                                }}
                                            >
                                                Alumnos
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCycle(cycle.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Create Modal Portal */}
            {isCreateModalOpen && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="formal-modal p-8 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-6 text-slate-900">Crear Nuevo Ciclo</h3>
                        <form onSubmit={handleCreateCycle} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre (Identificador)</label>
                                <input type="text" name="name" placeholder="Ej: Inicial Agosto 2024" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nivel / Tipo</label>
                                <select name="type" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400">
                                    <option value="initial">INICIAL</option>
                                    <option value="advanced">AVANZADO</option>
                                    <option value="plan_lider">PROGRAMA LIDER</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cupo</label>
                                    <input type="number" name="capacity" defaultValue={30} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Inicio</label>
                                    <input type="date" name="startDate" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-sm font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20">Crear Ciclo</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* View Students Modal Portal */}
            {selectedCycle && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setSelectedCycle(null)}>
                    <div className="formal-modal w-full max-w-2xl h-[80vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Alumnos Inscritos</h3>
                                <p className="text-xs font-bold text-blue-600 uppercase mt-1">
                                    {selectedCycle.name} • {formatType(selectedCycle.type)}
                                </p>
                            </div>
                            <button onClick={() => setSelectedCycle(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            {isLoadingStudents ? (
                                <p className="text-center text-slate-400 py-10">Cargando alumnos...</p>
                            ) : cycleStudents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <UsersIcon className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-medium text-sm">No hay alumnos inscritos en este ciclo.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cycleStudents.map(enrollment => (
                                        <div key={enrollment.id} className="flex items-center justify-between p-4 bg-white rounded-sm border border-slate-100 hover:border-blue-100 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-sm bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                                                    {enrollment.user ? enrollment.user.first_name.charAt(0) : '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">
                                                        {enrollment.user ? `${enrollment.user.first_name} ${enrollment.user.last_name}` : 'Usuario Desconocido'}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{enrollment.user?.email}</p>
                                                </div>
                                            </div>
                                            <button className="text-[10px] font-bold text-blue-600 uppercase border border-blue-100 px-3 py-1 hover:bg-blue-50 transition-colors">Detalle</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default AdminCalendar;
