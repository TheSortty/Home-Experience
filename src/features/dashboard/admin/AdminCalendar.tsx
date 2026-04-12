import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../services/supabaseClient';
import toast from 'react-hot-toast';
import UsersIcon from '../../../ui/icons/UsersIcon';
import TrashIcon from '../../../ui/icons/TrashIcon';
import StudentDetailModal, { StudentForModal, AttendanceBadge } from './StudentDetailModal';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface CycleSession {
    id: string;
    cycle_id: string;
    session_date: string;
    label: string | null;
    is_mandatory: boolean;
}

interface EnrolledStudent {
    enrollmentId: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    paymentStatus: string;
    referredBy: string;
    formData: any;
    medicalInfo: any;
    attendanceMap: Record<string, string>; // sessionId -> status
    programHistory: any[]; // Used for the modal
}

// ─── Main Component ──────────────────────────────────────────────────────────

const AdminCalendar: React.FC = () => {
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    const [trashCount, setTrashCount] = useState(0);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [cycleToDelete, setCycleToDelete] = useState<Cycle | null>(null);

    // Cycle Detail State
    const [cycleSessions, setCycleSessions] = useState<CycleSession[]>([]);
    const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [cycleCategory, setCycleCategory] = useState<'creser' | 'workshop' | 'coaching'>('creser');
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isAddingSession, setIsAddingSession] = useState(false);
    const [newSessionDate, setNewSessionDate] = useState('');

    // Student detail modal (shared)
    const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentForModal | null>(null);

    useEffect(() => { 
        fetchCycles(); 
        fetchTrashCount(); 

        // Canal con nombre único para evitar duplicados al cambiar viewMode
        const channelName = `calendar_changes_${Date.now()}`;
        const channel = supabase.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cycles' }, () => {
                fetchCycles();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => {
                fetchCycles();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [viewMode]);

    // ─── Fetch Cycles ────────────────────────────────────────────────────────

    const fetchTrashCount = async () => {
        const { count } = await supabase.from('cycles').select('*', { count: 'exact', head: true }).eq('is_deleted', true);
        if (count !== null) setTrashCount(count);
    };

    const fetchCycles = async () => {
        setLoading(true);
        const { data } = await supabase.from('cycles').select('*').eq('is_deleted', viewMode === 'trash').order('start_date', { ascending: true });
        setCycles(data || []);
        setLoading(false);
        fetchTrashCount();
    };

    const handleCreateCycle = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const fd = new FormData(form);
        await supabase.from('cycles').insert([{
            name: fd.get('name'), start_date: fd.get('startDate'), end_date: fd.get('endDate'),
            type: fd.get('type'), capacity: parseInt(fd.get('capacity') as string) || 30, status: 'active', enrolled_count: 0
        }]);
        fetchCycles(); setIsCreateModalOpen(false);
    };

    const handleSoftDelete = async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('cycles').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id || null }).eq('id', id);
        fetchCycles();
    };

    const handleRestore = async (id: string) => {
        await supabase.from('cycles').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', id);
        fetchCycles();
    };

    const handlePermanentDelete = async () => {
        if (!cycleToDelete) return;
        await supabase.from('cycles').delete().eq('id', cycleToDelete.id);
        setIsConfirmDeleteOpen(false); setCycleToDelete(null); fetchCycles();
    };

    // ─── Fetch Cycle Detail (Students + Sessions + Attendance) ───────────────

    const openCycleDetail = async (cycle: Cycle) => {
        setSelectedCycle(cycle);
        setIsLoadingDetail(true);
        setActiveSessionId(null);

        // Fetch sessions
        const { data: sessions } = await supabase.from('cycle_sessions').select('*').eq('cycle_id', cycle.id).order('session_date', { ascending: true });
        const sess = sessions || [];
        setCycleSessions(sess);

        // Fetch enrollments with user data
        const { data: enrollments } = await supabase.from('enrollments').select(`
            id, payment_status,
            user:profiles ( id, first_name, last_name, email, phone )
        `).eq('cycle_id', cycle.id);

        if (!enrollments || enrollments.length === 0) {
            setEnrolledStudents([]);
            setIsLoadingDetail(false);
            return;
        }

        // Fetch form submissions for referredBy
        const emails = enrollments.map((e: any) => e.user?.email).filter(Boolean);
        const { data: submissions } = await supabase.from('form_submissions').select('email, data').in('email', emails);
        const subMap = (submissions || []).reduce((acc: any, c: any) => { acc[c.email] = c.data; return acc; }, {});

        // Fetch medical info
        const userIds = enrollments.map((e: any) => e.user?.id).filter(Boolean);
        const { data: medicalData } = await supabase.from('medical_info').select('*').in('user_id', userIds);
        const medMap = (medicalData || []).reduce((acc: any, c: any) => { acc[c.user_id] = c; return acc; }, {});

        // Fetch ALL enrollments for these users to build program history
        const { data: allUserEnrollments } = await supabase.from('enrollments').select(`
            id, status, payment_status, user_id,
            cycle:cycles ( id, name, type, start_date ),
            attendance ( id, status ),
            payments ( amount, method, status, paid_at )
        `).in('user_id', userIds);

        // Fetch session counts for these historical cycles
        const allCycleIds = (allUserEnrollments || []).map((e: any) => e.cycle?.id).filter(Boolean);
        let sessionsMap: Record<string, number> = {};
        if (allCycleIds.length > 0) {
            const { data: sessions } = await supabase.from('cycle_sessions').select('cycle_id').in('cycle_id', allCycleIds);
            sessionsMap = (sessions || []).reduce((acc: any, s: any) => { acc[s.cycle_id] = (acc[s.cycle_id] || 0) + 1; return acc; }, {});
        }

        // Group enrollments into programHistory per user
        const historyMap: Record<string, any[]> = {};
        (allUserEnrollments || []).forEach((e: any) => {
            if (!historyMap[e.user_id]) historyMap[e.user_id] = [];
            const attCount = e.attendance?.filter((a: any) => ['present', 'late'].includes(a.status)).length || 0;
            const cycleId = e.cycle?.id;
            const totalSess = cycleId ? (sessionsMap[cycleId] || 0) : 0;
            const pay = e.payments?.[0];
            historyMap[e.user_id].push({
                id: e.id,
                cycleName: e.cycle?.name || 'Desconocido',
                cycleType: e.cycle?.type || 'initial',
                status: e.status === 'active' ? 'ACTIVE' : (e.status === 'conflict' ? 'CONFLICT' : 'GRADUATED'),
                attendanceCount: attCount,
                totalSessions: totalSess,
                paymentInfo: pay ? {
                    amount: pay.amount,
                    method: pay.method === 'mercadopago' ? 'Mercado Pago' : (pay.method === 'transfer' ? 'Transferencia' : 'Efectivo'),
                    status: pay.status === 'paid' ? 'Pagado' : 'Pendiente',
                    paidAt: pay.paid_at ? new Date(pay.paid_at).toLocaleDateString() : '-'
                } : null,
                notes: e.notes || '',
                startDate: e.cycle?.start_date || '9999-12-31'
            });
        });

        // Sort programHistory by start_date descending
        Object.keys(historyMap).forEach(uid => {
            historyMap[uid].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        });

        // Fetch attendance for the current cycle view
        const enrollmentIds = enrollments.map((e: any) => e.id);
        const { data: attendance } = await supabase.from('attendance').select('*').in('enrollment_id', enrollmentIds);
        const attMap: Record<string, Record<string, string>> = {};
        (attendance || []).forEach((a: any) => {
            if (!attMap[a.enrollment_id]) attMap[a.enrollment_id] = {};
            attMap[a.enrollment_id][a.cycle_session_id] = a.status;
        });

        const students: EnrolledStudent[] = enrollments.map((e: any) => {
            const fData = subMap[e.user?.email] || {};
            return {
                enrollmentId: e.id,
                userId: e.user?.id || '',
                firstName: e.user?.first_name || '',
                lastName: e.user?.last_name || '',
                email: e.user?.email || '',
                phone: e.user?.phone || fData.phone || '', // Fallback to formData
                paymentStatus: e.payment_status || 'unpaid',
                referredBy: fData.referredBy || '',
                formData: fData,
                medicalInfo: medMap[e.user?.id] || null,
                attendanceMap: attMap[e.id] || {},
                programHistory: historyMap[e.user?.id] || []
            };
        });

        setEnrolledStudents(students);
        setIsLoadingDetail(false);
    };

    // ─── Session Management ──────────────────────────────────────────────────

    const handleAddSession = async () => {
        if (!newSessionDate || !selectedCycle) return;
        const { error } = await supabase.from('cycle_sessions').insert([{
            cycle_id: selectedCycle.id,
            session_date: newSessionDate,
            is_mandatory: true
        }]);
        if (error) { toast.error('Error: ' + error.message); return; }
        setNewSessionDate(''); setIsAddingSession(false);
        openCycleDetail(selectedCycle);
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!selectedCycle) return;
        await supabase.from('attendance').delete().eq('cycle_session_id', sessionId);
        await supabase.from('cycle_sessions').delete().eq('id', sessionId);
        openCycleDetail(selectedCycle);
    };

    // ─── Attendance Toggle ───────────────────────────────────────────────────

    const handleAttendanceToggle = async (enrollmentId: string, sessionId: string, desiredStatus: string) => {
        // Optimistic update
        setEnrolledStudents(prev => prev.map(s =>
            s.enrollmentId === enrollmentId
                ? { ...s, attendanceMap: { ...s.attendanceMap, [sessionId]: desiredStatus } }
                : s
        ));

        await supabase.from('attendance').upsert({
            enrollment_id: enrollmentId,
            cycle_session_id: sessionId,
            status: desiredStatus,
            recorded_at: new Date().toISOString()
        }, { onConflict: 'enrollment_id, cycle_session_id' });
    };

    // ─── Open Student Detail (shared modal) ──────────────────────────────────

    const openStudentDetail = (student: EnrolledStudent) => {
        const s: StudentForModal = {
            id: student.userId,
            name: `${student.firstName} ${student.lastName}`,
            email: student.email,
            phone: student.phone || '-',
            programHistory: student.programHistory,
            formData: student.formData,
            medicalInfo: student.medicalInfo,
        };
        setSelectedStudentForDetail(s);
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const getAttendancePct = (student: EnrolledStudent) => {
        if (cycleSessions.length === 0) return -1;
        const present = Object.values(student.attendanceMap).filter(s => ['present', 'late'].includes(s)).length;
        return Math.round((present / cycleSessions.length) * 100);
    };

    const formatWhatsApp = (phone: string) => {
        const cleaned = phone.replace(/[\s\-()]/g, '');
        return `https://wa.me/${cleaned}`;
    };

    const getLevelColor = (type: string) => {
        switch (type) { case 'initial': return 'bg-blue-500'; case 'advanced': return 'bg-purple-500'; case 'plan_lider': return 'bg-indigo-600'; case 'workshop': return 'bg-orange-500'; case 'coaching': return 'bg-green-500'; default: return 'bg-slate-500'; }
    };

    function formatType(type: string) {
        switch (type) {
            case 'initial': return 'Inicial';
            case 'advanced': return 'Avanzado';
            case 'plan_lider': return 'Programa Líder';
            case 'workshop': return 'Taller / Evento';
            case 'coaching': return 'Coaching (CC)';
            default: return type.toUpperCase();
        }
    };

    const filteredCycles = cycles.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.type.toLowerCase().includes(searchTerm.toLowerCase()));

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-8 h-full animate-fade-in-up">
                <div className="flex-1 formal-card overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold text-slate-800">{viewMode === 'active' ? 'Programación de Ciclos' : 'Papelera'}</h3>
                            {viewMode === 'active' ? (
                                <button onClick={() => setViewMode('trash')} className="p-2 text-slate-300 hover:text-red-500 transition-colors relative" title="Papelera">
                                    <TrashIcon className="w-4 h-4" />
                                    {trashCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">{trashCount}</span>}
                                </button>
                            ) : (
                                <button onClick={() => setViewMode('active')} className="px-3 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-sm transition-colors uppercase tracking-wider">Volver</button>
                            )}
                        </div>
                        {viewMode === 'active' && (
                            <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-blue-700 transition-colors">+ Nuevo Ciclo</button>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                        <input type="text" placeholder="Buscar por nombre o tipo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-sm text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>

                    <div className="overflow-y-auto p-6 space-y-4">
                        {loading ? <p className="text-center text-slate-400">Cargando ciclos...</p> : filteredCycles.length === 0 ? <p className="text-center text-slate-400">No hay ciclos.</p> : (
                            filteredCycles.map(cycle => (
                                <div key={cycle.id} className="bg-white border border-slate-100 rounded-sm p-4 hover:border-blue-200 transition-all flex items-center justify-between cursor-pointer group" onClick={() => openCycleDetail(cycle)}>
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
                                                <UsersIcon className="w-3 h-3 mr-1" />{cycle.enrolled_count} / {cycle.capacity}
                                            </div>
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (cycle.enrolled_count / cycle.capacity) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${cycle.status === 'finished' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {cycle.status === 'active' ? 'Activo' : 'Finalizado'}
                                            </span>
                                            {viewMode === 'active' ? (
                                                <button onClick={(e) => { e.stopPropagation(); handleSoftDelete(cycle.id); }} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Papelera">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <button onClick={() => handleRestore(cycle.id)} className="text-blue-600 text-[10px] font-bold uppercase hover:underline">Restaurar</button>
                                                    <button onClick={() => { setCycleToDelete(cycle); setIsConfirmDeleteOpen(true); }} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
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

            {/* ─── Create Cycle Modal ─────────────────────────────────────── */}
            {isCreateModalOpen && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="formal-modal p-8 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-6 text-slate-900">Crear Nuevo Ciclo CRESER</h3>
                        <form onSubmit={handleCreateCycle} className="space-y-4">
                            {/* Oculto temporalmente por pedido del usuario */}
                            <div className="hidden">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoría Principal</label>
                                <select 
                                    value={cycleCategory} 
                                    onChange={(e) => setCycleCategory(e.target.value as any)} 
                                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400 font-bold text-slate-700"
                                >
                                    <option value="creser">Programa CReSER</option>
                                    <option value="workshop">Taller / Evento Especial</option>
                                    <option value="coaching">Sesión de Coaching (CC)</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Etapa CReSER</label>
                                        <select name="type" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400">
                                            <option value="initial">INICIAL</option>
                                            <option value="advanced">AVANZADO</option>
                                            <option value="plan_lider">PROGRAMA LIDER</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre</label>
                                        <input type="text" name="name" placeholder="Ej: Inicial Agosto 2024" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cupo Max.</label>
                                    <input type="number" name="capacity" defaultValue={30} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Inicio</label>
                                    <input type="date" name="startDate" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fin</label>
                                    <input type="date" name="endDate" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-sm font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20">Crear</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ─── Cycle Detail Modal (Students + Sessions + Attendance) ─── */}
            {selectedCycle && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setSelectedCycle(null)}>
                    <div className="formal-modal w-full max-w-5xl h-[90vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{selectedCycle.name}</h3>
                                <p className="text-xs font-bold text-blue-600 uppercase mt-1">{formatType(selectedCycle.type)} • {enrolledStudents.length} alumnos</p>
                            </div>
                            <button onClick={() => setSelectedCycle(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors">✕</button>
                        </div>

                        {/* Session Bar */}
                        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 overflow-x-auto shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Sesiones:</span>
                            {cycleSessions.map(session => (
                                <div key={session.id} className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => setActiveSessionId(activeSessionId === session.id ? null : session.id)}
                                        className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all border ${activeSessionId === session.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
                                    >
                                        {new Date(session.session_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                    </button>
                                    <button onClick={() => handleDeleteSession(session.id)} className="text-slate-200 hover:text-red-500 transition-colors" title="Eliminar sesión">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                            {isAddingSession ? (
                                <div className="flex items-center gap-2 shrink-0">
                                    <input type="date" value={newSessionDate} onChange={e => setNewSessionDate(e.target.value)} className="px-2 py-1 border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                    <button onClick={handleAddSession} className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded-sm hover:bg-emerald-700 transition-colors">✓</button>
                                    <button onClick={() => setIsAddingSession(false)} className="px-2 py-1.5 text-slate-400 text-[10px] font-bold uppercase hover:text-slate-600">✕</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsAddingSession(true)} className="px-3 py-1.5 border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold uppercase rounded-sm hover:border-blue-400 hover:text-blue-500 transition-colors shrink-0">
                                    + Sesión
                                </button>
                            )}
                        </div>

                        {/* Student Cards Grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {isLoadingDetail ? (
                                <p className="text-center text-slate-400 py-10">Cargando alumnos...</p>
                            ) : enrolledStudents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <UsersIcon className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-medium text-sm">No hay alumnos inscritos.</p>
                                </div>
                            ) : (
                                <>
                                {/* Attendance Mode / Empty State */}
                                    {!activeSessionId && cycleSessions.length > 0 ? (
                                        <div className="mb-8 p-6 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">👈 Selecciona una sesión arriba</p>
                                            <p className="text-xs text-slate-400">Haz clic en la fecha de cualquier sesión en la barra superior para abrir la lista y tomar asistencia.</p>
                                        </div>
                                    ) : activeSessionId && (
                                        <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-xl">
                                            <div className="flex justify-between items-center mb-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-1">
                                                        📋 Asistencia
                                                    </h4>
                                                    <p className="text-xs text-blue-500 font-medium">
                                                        {cycleSessions.find(s => s.id === activeSessionId)?.session_date && new Date(cycleSessions.find(s => s.id === activeSessionId)!.session_date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                    </p>
                                                </div>
                                                <button onClick={() => setActiveSessionId(null)} className="px-4 py-2 bg-white rounded-sm text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white transition-colors uppercase tracking-wider shadow-sm">Cerrar Lista</button>
                                            </div>
                                            <div className="space-y-3">
                                                {enrolledStudents.map(student => {
                                                    const status = student.attendanceMap[activeSessionId];
                                                    return (
                                                        <div key={student.enrollmentId} className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-blue-50/50 shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{student.firstName.charAt(0)}</div>
                                                                <span className="text-sm font-bold text-slate-800">{student.firstName} {student.lastName}</span>
                                                            </div>
                                                            <div className="flex gap-2.5">
                                                                {(['present', 'absent', 'late'] as const).map(s => (
                                                                    <button
                                                                        key={s}
                                                                        onClick={() => handleAttendanceToggle(student.enrollmentId, activeSessionId, s)}
                                                                        className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all border ${status === s
                                                                            ? s === 'present' ? 'bg-emerald-600 text-white border-emerald-600'
                                                                                : s === 'absent' ? 'bg-red-600 text-white border-red-600'
                                                                                    : 'bg-amber-500 text-white border-amber-500'
                                                                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                                                                        }`}
                                                                    >
                                                                        {s === 'present' ? '✓ Presente' : s === 'absent' ? '✕ Ausente' : '⏰ Tarde'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {enrolledStudents.map(student => {
                                            const pct = getAttendancePct(student);
                                            const presentCount = Object.values(student.attendanceMap).filter((s: string) => ['present', 'late'].includes(s)).length;
                                            return (
                                                <div
                                                    key={student.enrollmentId}
                                                    className="bg-white border border-slate-100 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group flex flex-col"
                                                    onClick={() => openStudentDetail(student)}
                                                >
                                                    {/* Card Header */}
                                                    <div className="flex items-start justify-between mb-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                                                                {student.firstName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-lg leading-tight">{student.firstName} {student.lastName}</p>
                                                                <p className="text-xs text-slate-400 font-medium mt-1">{student.email}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-sm uppercase tracking-wider border ${student.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                            {student.paymentStatus === 'paid' ? '✅ Pagado' : '⏳ Pendiente'}
                                                        </span>
                                                    </div>

                                                    {/* Card Body */}
                                                    <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
                                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col justify-center items-center">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Asistencia</label>
                                                            <AttendanceBadge count={presentCount} total={cycleSessions.length} />
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col justify-center items-center text-center">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Referido por</label>
                                                            <p className="text-xs text-slate-700 font-bold">{student.referredBy || <span className="text-slate-400 italic font-normal">Nadie / Auto-Inscripto</span>}</p>
                                                        </div>
                                                    </div>

                                                    {/* Card Footer */}
                                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                                                        {student.phone && student.phone !== '-' ? (
                                                            <a
                                                                href={formatWhatsApp(student.phone as string)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={e => e.stopPropagation()}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-widest rounded-sm border border-emerald-200 hover:bg-emerald-100 hover:shadow-sm transition-all"
                                                            >
                                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.636-1.468A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.168 0-4.19-.588-5.932-1.614l-.425-.248-2.752.872.87-2.686-.276-.44A9.776 9.776 0 012.182 12c0-5.423 4.395-9.818 9.818-9.818S21.818 6.577 21.818 12s-4.395 9.818-9.818 9.818z"/></svg>
                                                                WhatsApp
                                                            </a>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 italic">Sin teléfono registrado</span>
                                                        )}
                                                        <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Ver perfil completo <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Shared Student Detail Modal */}
            {selectedStudentForDetail && (
                <StudentDetailModal
                    student={selectedStudentForDetail}
                    onClose={() => setSelectedStudentForDetail(null)}
                />
            )}

            {/* Confirm Delete Cycle */}
            {isConfirmDeleteOpen && cycleToDelete && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setIsConfirmDeleteOpen(false)}>
                    <div className="formal-modal max-w-md w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><TrashIcon className="w-8 h-8" /></div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar ciclo?</h3>
                            <p className="text-sm text-slate-500 mb-8">Borrar permanentemente <strong>{cycleToDelete.name}</strong>. No se puede deshacer.</p>
                            <div className="flex gap-4 w-full">
                                <button onClick={() => setIsConfirmDeleteOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-slate-200 transition-all">Cancelar</button>
                                <button onClick={handlePermanentDelete} className="flex-1 py-3 bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-all">Eliminar</button>
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
