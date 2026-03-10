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
    is_deleted?: boolean;
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
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    const [trashCount, setTrashCount] = useState(0);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [cycleToDelete, setCycleToDelete] = useState<Cycle | null>(null);
    const [cycleSessions, setCycleSessions] = useState<any[]>([]);
    const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, string>>>({}); // { enrollmentId: { sessionId: status } }
    const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

    useEffect(() => {
        fetchCycles();
        fetchTrashCount();
    }, [viewMode]);

    const fetchTrashCount = async () => {
        const { count, error } = await supabase
            .from('cycles')
            .select('*', { count: 'exact', head: true })
            .eq('is_deleted', true);

        if (!error && count !== null) {
            setTrashCount(count);
        }
    };

    const fetchCycles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cycles')
            .select('*')
            .eq('is_deleted', viewMode === 'trash')
            .order('start_date', { ascending: true });

        if (error) {
            console.error('Error fetching cycles:', error);
        } else {
            setCycles(data || []);
        }
        setLoading(false);
        fetchTrashCount();
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

    const handleSoftDelete = async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('cycles')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: user?.id || null
            })
            .eq('id', id);

        if (error) {
            alert('Error al mover a la papelera');
        } else {
            fetchCycles();
        }
    };

    const handleRestore = async (id: string) => {
        const { error } = await supabase
            .from('cycles')
            .update({
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            })
            .eq('id', id);

        if (error) {
            alert('Error al restaurar');
        } else {
            fetchCycles();
        }
    };

    const handlePermanentDelete = async () => {
        if (!cycleToDelete) return;

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
            .from('cycles')
            .delete()
            .eq('id', cycleToDelete.id);

        if (error) {
            alert('Error al eliminar definitivamente: ' + error.message);
        } else {
            setIsConfirmDeleteOpen(false);
            setCycleToDelete(null);
            fetchCycles();
        }
    };

    const fetchStudentsForCycle = async (cycleId: string) => {
        setIsLoadingStudents(true);
        setIsAttendanceLoading(true);

        // 1. Fetch Students
        const { data: enrollments, error: enrollError } = await supabase
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

        if (enrollError) {
            console.error('Error fetching students:', enrollError);
            setCycleStudents([]);
        } else {
            setCycleStudents(enrollments as any[]);

            // 2. Fetch Sessions for this cycle
            const { data: sessions, error: sessError } = await supabase
                .from('cycle_sessions')
                .select('*')
                .eq('cycle_id', cycleId)
                .order('session_date', { ascending: true });

            if (!sessError && sessions) {
                setCycleSessions(sessions);

                // 3. Fetch Attendance for these enrollments and sessions
                const enrollmentIds = (enrollments as any[]).map(e => e.id);
                if (enrollmentIds.length > 0) {
                    const { data: attendance, error: attError } = await supabase
                        .from('attendance')
                        .select('*')
                        .in('enrollment_id', enrollmentIds);

                    if (!attError && attendance) {
                        const attMap: Record<string, Record<string, string>> = {};
                        attendance.forEach(item => {
                            if (!attMap[item.enrollment_id]) attMap[item.enrollment_id] = {};
                            attMap[item.enrollment_id][item.cycle_session_id] = item.status;
                        });
                        setAttendanceData(attMap);
                    }
                }
            }
        }
        setIsLoadingStudents(false);
        setIsAttendanceLoading(false);
    };

    const handleAttendanceToggle = async (enrollmentId: string, sessionId: string, currentStatus: string | undefined) => {
        const statuses = ['present', 'absent', 'late'];
        const currentIndex = currentStatus ? statuses.indexOf(currentStatus) : -1;
        const nextStatus = statuses[(currentIndex + 1) % statuses.length];

        // Optimistic update
        setAttendanceData(prev => ({
            ...prev,
            [enrollmentId]: {
                ...(prev[enrollmentId] || {}),
                [sessionId]: nextStatus
            }
        }));

        // Upsert to DB
        const { error } = await supabase
            .from('attendance')
            .upsert({
                enrollment_id: enrollmentId,
                cycle_session_id: sessionId,
                status: nextStatus,
                recorded_at: new Date().toISOString()
            }, {
                onConflict: 'enrollment_id, cycle_session_id'
            });

        if (error) {
            console.error('Error updating attendance:', error);
            // Revert optimistic update
            fetchStudentsForCycle(selectedCycle?.id || '');
        }
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
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold text-slate-800">
                                {viewMode === 'active' ? 'Programación de Ciclos' : 'Papelera de Ciclos'}
                            </h3>
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
                        {viewMode === 'active' && (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-blue-700 transition-colors"
                            >
                                + Nuevo Ciclo
                            </button>
                        )}
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
                                <div
                                    key={cycle.id}
                                    className="bg-white border border-slate-100 rounded-sm p-4 hover:border-blue-200 transition-all flex items-center justify-between cursor-pointer group"
                                    onClick={() => {
                                        setSelectedCycle(cycle);
                                        fetchStudentsForCycle(cycle.id);
                                    }}
                                >
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
                                            {viewMode === 'active' ? (
                                                <>
                                                    <button
                                                        className="text-blue-600 text-[10px] font-bold uppercase border border-blue-50 px-2 py-1 rounded-sm hover:bg-blue-50 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedCycle(cycle);
                                                            fetchStudentsForCycle(cycle.id);
                                                        }}
                                                    >
                                                        Alumnos
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSoftDelete(cycle.id);
                                                        }}
                                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                        title="Mover a papelera"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => handleRestore(cycle.id)}
                                                        className="text-blue-600 text-[10px] font-bold uppercase hover:underline"
                                                    >
                                                        Restaurar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCycleToDelete(cycle);
                                                            setIsConfirmDeleteOpen(true);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 transition-colors"
                                                        title="Eliminar definitivamente"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
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
                                            <div className="flex items-center gap-6">
                                                {/* Attendance Circles */}
                                                <div className="flex items-center gap-1.5">
                                                    {cycleSessions.length === 0 ? (
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Sin calendario</span>
                                                    ) : (
                                                        cycleSessions.map((session) => {
                                                            const status = attendanceData[enrollment.id]?.[session.id];
                                                            let colorClass = 'bg-slate-100 border-slate-200';
                                                            if (status === 'present') colorClass = 'bg-emerald-500 border-emerald-600';
                                                            if (status === 'absent') colorClass = 'bg-rose-500 border-rose-600';
                                                            if (status === 'late') colorClass = 'bg-amber-400 border-amber-500';

                                                            return (
                                                                <button
                                                                    key={session.id}
                                                                    onClick={() => handleAttendanceToggle(enrollment.id, session.id, status)}
                                                                    disabled={isAttendanceLoading}
                                                                    className={`w-3.5 h-3.5 rounded-full border transition-all hover:scale-110 ${colorClass}`}
                                                                    title={`${new Date(session.session_date).toLocaleDateString()}: ${status || 'Sin registrar'}`}
                                                                />
                                                            );
                                                        })
                                                    )}
                                                </div>
                                                <button className="text-[10px] font-bold text-blue-600 uppercase border border-blue-100 px-3 py-1 hover:bg-blue-50 transition-colors">Detalle</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Confirm Permanent Delete Modal Portal */}
            {isConfirmDeleteOpen && cycleToDelete && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setIsConfirmDeleteOpen(false)}>
                    <div className="formal-modal max-w-md w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                                <TrashIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar ciclo definitivamente?</h3>
                            <p className="text-sm text-slate-500 mb-8">
                                Estás a punto de borrar permanentemente el ciclo <strong>{cycleToDelete.name}</strong>. Esta acción no se puede deshacer y podría afectar a los alumnos inscritos.
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
        </>
    );
};

export default AdminCalendar;
