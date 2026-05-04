import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../services/supabaseClient';
import CheckIcon from '../../../ui/icons/CheckIcon';
import TrashIcon from '../../../ui/icons/TrashIcon';

export interface ProgramHistoryItem {
    id: string;
    cycleName: string;
    cycleType: string;
    status: 'ACTIVE' | 'CONFLICT' | 'GRADUATED';
    attendanceCount: number;
    totalSessions: number;
    paymentInfo?: { amount: number; method: string; status: string; paidAt: string } | null;
    notes?: string;
}

export interface StudentForModal {
    id: string;
    name: string;
    email: string;
    phone: string;
    programHistory: ProgramHistoryItem[];
    formData: any;
    medicalInfo: any | null; // typing as any for simplicity here to match usage
    is_deleted?: boolean;
}

interface Goal {
    id: string;
    goal_description: string;
    target_date: string;
    status: 'pending' | 'achieved';
    staff_feedback: string;
}

export const AttendanceBadge: React.FC<{ count: number; total: number }> = ({ count, total }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    let colorClasses = 'bg-slate-100 text-slate-500 border-slate-200';
    if (total > 0) {
        if (pct >= 80) colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        else if (pct >= 50) colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        else colorClasses = 'bg-red-50 text-red-700 border-red-200';
    }
    return (
        <div className="flex flex-col items-center gap-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-bold border ${colorClasses}`}>
                {total > 0 ? `${pct}%` : 'N/A'}
            </span>
            {total > 0 && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{count}/{total} sesiones</span>}
        </div>
    );
};

interface StudentDetailModalProps {
    student: StudentForModal;
    onClose: () => void;
    onSoftDelete?: (id: string) => void;
    onRestore?: (id: string) => void;
    onPermanentDelete?: (student: StudentForModal) => void;
    role?: 'admin' | 'sysadmin';
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
    student,
    onClose,
    onSoftDelete,
    onRestore,
    onPermanentDelete,
    role = 'admin',
}) => {
    const [detailTab, setDetailTab] = useState('PERSONAL');
    const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
    const [studentGoals, setStudentGoals] = useState<Goal[]>([]);
    const [isLoadingGoals, setIsLoadingGoals] = useState(false);

    // Program Notes State
    const [programNotes, setProgramNotes] = useState<{ id: string, content: string, created_at: string }[]>([]);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);

    // ── Carta de Enrolamiento (SYSADMIN ONLY) ──
    const [carta, setCarta] = useState<any | null>(null);
    const [isLoadingCarta, setIsLoadingCarta] = useState(false);
    const [isSavingCarta, setIsSavingCarta] = useState(false);
    const [cartaDraft, setCartaDraft] = useState<any>({});

    // ── Planilla Magna (SYSADMIN ONLY) ──
    const [checkins, setCheckins] = useState<any[]>([]);
    const [isLoadingCheckins, setIsLoadingCheckins] = useState(false);
    const [isSavingCheckin, setIsSavingCheckin] = useState(false);
    const [editingWeek, setEditingWeek] = useState<number | null>(null);
    const [weekDraft, setWeekDraft] = useState<Record<string, number>>({});

    const GOAL_AREAS = [
        { key: 'professional',  label: 'Profesional' },
        { key: 'personal',      label: 'Personal' },
        { key: 'relationships', label: 'Vínculos' },
        { key: 'community',     label: 'Comunidad' },
        { key: 'legacy',        label: 'Legado' },
    ] as const;

    // Find the PL enrollment for carta/checkins
    const plEnrollment = student.programHistory?.find((p: any) => p.cycleType === 'plan_lider');

    useEffect(() => {
        if (detailTab === 'PROGRAMAS' && student.programHistory?.length > 0 && !activeProgramId) {
            setActiveProgramId(student.programHistory[0].id);
        }
    }, [detailTab, student.programHistory, activeProgramId]);

    useEffect(() => {
        if (activeProgramId) fetchProgramNotes(activeProgramId);
    }, [activeProgramId]);

    useEffect(() => {
        if (detailTab === 'METAS') fetchGoals(student.id);
        if (detailTab === 'CARTA' && plEnrollment) fetchCarta(plEnrollment.id);
        if (detailTab === 'PLANILLA_PL' && plEnrollment) fetchCheckins(plEnrollment.id);
    }, [detailTab, student.id, plEnrollment?.id]);

    const fetchProgramNotes = async (enrollmentId: string) => {
        setIsLoadingNotes(true);
        const { data } = await supabase.from('enrollment_notes').select('*').eq('enrollment_id', enrollmentId).order('created_at', { ascending: false });
        setProgramNotes(data || []);
        setIsLoadingNotes(false);
    };

    const fetchGoals = async (studentId: string) => {
        setIsLoadingGoals(true);
        const { data: enrollments } = await supabase.from('enrollments').select('id').eq('user_id', studentId).limit(1);
        if (enrollments && enrollments.length > 0) {
            const { data: goals } = await supabase.from('student_goals').select('*').eq('enrollment_id', enrollments[0].id);
            setStudentGoals(goals || []);
        } else {
            setStudentGoals([]);
        }
        setIsLoadingGoals(false);
    };

    const fetchCarta = async (enrollmentId: string) => {
        setIsLoadingCarta(true);
        const { data } = await supabase.from('student_goals').select('*').eq('enrollment_id', enrollmentId).single();
        setCarta(data || null);
        setCartaDraft(data || { contrato: '', estiramiento: '', nabo_descripcion: '', equipo_asistencia: '', goals_data: {} });
        setIsLoadingCarta(false);
    };

    const saveCarta = async () => {
        if (!plEnrollment) return;
        setIsSavingCarta(true);
        await supabase.from('student_goals').upsert({
            enrollment_id: plEnrollment.id,
            ...cartaDraft,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'enrollment_id' });
        await fetchCarta(plEnrollment.id);
        setIsSavingCarta(false);
    };

    const fetchCheckins = async (enrollmentId: string) => {
        setIsLoadingCheckins(true);
        const { data } = await supabase.from('weekly_checkins').select('*').eq('enrollment_id', enrollmentId).order('week_number', { ascending: true });
        setCheckins(data || []);
        setIsLoadingCheckins(false);
    };

    const saveWeekCheckin = async (weekNum: number) => {
        if (!plEnrollment) return;
        setIsSavingCheckin(true);
        await supabase.from('weekly_checkins').upsert({
            enrollment_id: plEnrollment.id,
            week_number: weekNum,
            scores: weekDraft,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'enrollment_id,week_number' });
        await fetchCheckins(plEnrollment.id);
        setEditingWeek(null);
        setIsSavingCheckin(false);
    };

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleAddNote = async (enrollmentId: string) => {
        if (!newNoteContent.trim()) return;
        setIsSavingNote(true);
        try {
            const { data, error } = await supabase.from('enrollment_notes').insert([{
                enrollment_id: enrollmentId,
                content: newNoteContent.trim()
            }]).select();

            if (!error && data) {
                setProgramNotes([data[0], ...programNotes]);
                setNewNoteContent('');
            } else {
                console.error('Error saving note', error);
            }
        } catch (err) {
            console.error('Error saving notes', err);
        }
        setIsSavingNote(false);
    };

    const latestProgram = student.programHistory?.[0];

    return createPortal(
        <div className="full-screen-modal-overlay" onClick={onClose}>
            <div className="formal-modal max-w-5xl w-full p-0 flex flex-col h-[85vh] animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-8 border-b border-slate-100 bg-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{student.name}</h3>
                        <div className="flex items-center gap-4 mt-3">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em]">{student.email}</p>
                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID: {student.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Programa Actual</p>
                            <span className="px-4 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-sm uppercase tracking-[0.1em]">
                                {latestProgram?.cycleName || 'SIN ASIGNAR'}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-all border border-slate-100"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Body with Sidebar */}
                <div className="flex flex-1 overflow-hidden bg-slate-50/30">
                    
                    {/* Left Tabs Sidebar */}
                    <div className="w-64 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-between overflow-y-auto">
                        <div className="space-y-2 relative">
                            {[
                                {
                                    id: 'PERSONAL', label: 'Perfil & Contacto', sysadmin: false,
                                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                },
                                {
                                    id: 'MOTIVACIÓN', label: 'Propósito & Sueños', sysadmin: false,
                                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                },
                                {
                                    id: 'SALUD', label: 'Ficha Médica', sysadmin: false,
                                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                },
                                {
                                    id: 'PROGRAMAS', label: 'Historial CRESER', sysadmin: false,
                                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                },
                                {
                                    id: 'METAS', label: 'Seguimiento', sysadmin: true,
                                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                },
                                {
                                    id: 'CARTA', label: 'Carta PL', sysadmin: true,
                                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                },
                                {
                                    id: 'PLANILLA_PL', label: 'Planilla Magna', sysadmin: true,
                                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                },
                                {
                                    id: 'CAMPUS', label: 'Campus (Beta)', sysadmin: true,
                                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                },
                            ].filter(s => !s.sysadmin || role === 'sysadmin').map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setDetailTab(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all ${detailTab === section.id
                                        ? 'bg-white text-blue-600 shadow-md shadow-slate-200/50 border border-slate-100 translate-x-1'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {section.icon}
                                    {section.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 mt-8 bg-white border border-slate-100 rounded-sm">
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-2">Estado del alumno</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${student.is_deleted ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
                                <span className="text-[10px] font-bold text-slate-600 uppercase">{student.is_deleted ? 'En Papelera' : 'Activo'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 overflow-y-auto p-12 bg-white">
                        <div className="max-w-4xl mx-auto">
                            
                            <div className="mb-12">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-3">
                                    {detailTab === 'PERSONAL'    && 'Sección 01'}
                                    {detailTab === 'MOTIVACIÓN'  && 'Sección 02'}
                                    {detailTab === 'SALUD'       && 'Sección 03'}
                                    {detailTab === 'OTROS'       && 'Sección 04'}
                                    {detailTab === 'PROGRAMAS'   && 'Sección 05'}
                                    {detailTab === 'METAS'       && 'Sección 06'}
                                    {detailTab === 'CARTA'       && <span className="text-purple-600">SYSADMIN · Sección 07</span>}
                                    {detailTab === 'PLANILLA_PL' && <span className="text-purple-600">SYSADMIN · Sección 08</span>}
                                    {detailTab === 'CAMPUS'      && <span className="text-purple-600">SYSADMIN · Sección 09</span>}
                                </h4>
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    {detailTab === 'PERSONAL'    && 'Información de Contacto y Perfil'}
                                    {detailTab === 'MOTIVACIÓN'  && 'Propósito, Sueños y Metas'}
                                    {detailTab === 'SALUD'       && 'Historial Médico y Emergencias'}
                                    {detailTab === 'OTROS'       && 'Información Adicional Recopilada'}
                                    {detailTab === 'PROGRAMAS'   && 'Historial de Programas CRESER'}
                                    {detailTab === 'METAS'       && 'Seguimiento de Plan Líder'}
                                    {detailTab === 'CARTA'       && 'Carta de Enrolamiento — Plan Líder'}
                                    {detailTab === 'PLANILLA_PL' && 'Planilla Magna — Seguimiento 13 Semanas'}
                                    {detailTab === 'CAMPUS'      && 'Campus Digital (Beta)'}
                                </h2>
                                <div className="h-1 w-12 bg-blue-600 mt-6 rounded-full"></div>
                            </div>

                            {/* Render logic based on Detail Tab */}
                            {detailTab === 'PROGRAMAS' && (
                                <div className="space-y-6">
                                    {student.programHistory && student.programHistory.length > 0 ? (
                                        <>
                                            {/* Windows-style folder tabs */}
                                            <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
                                                {student.programHistory.map((prog) => (
                                                    <button
                                                        key={prog.id}
                                                        onClick={() => setActiveProgramId(prog.id)}
                                                        className={`px-8 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-t-md border-t border-l border-r shrink-0 ${
                                                            activeProgramId === prog.id
                                                                ? 'bg-white border-slate-200 text-blue-600 border-b-white -mb-[1px] shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.02)] relative z-10'
                                                                : 'bg-slate-50 border-slate-100/50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border-b-slate-200'
                                                        }`}
                                                    >
                                                        {prog.cycleName}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Selected Program Content */}
                                            {student.programHistory.filter(p => p.id === activeProgramId).map(prog => (
                                                <div key={prog.id} className="p-8 bg-white border border-slate-200 rounded-b-xl rounded-tr-xl shadow-sm animate-fade-in -mt-px relative z-0">
                                                    <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                                                        <div>
                                                            <span className="text-2xl font-bold text-slate-800 block leading-tight mb-2">{prog.cycleName}</span>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{prog.cycleType === 'plan_lider' ? 'PROGRAMA LIDER' : prog.cycleType}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-sm uppercase tracking-wider border ${prog.status === 'ACTIVE' ? 'text-emerald-700 bg-emerald-100 border-emerald-200' : prog.status === 'CONFLICT' ? 'text-red-700 bg-red-100 border-red-200' : 'text-slate-700 bg-slate-200 border-slate-300'}`}>
                                                            {prog.status === 'ACTIVE' ? 'Cursando' : prog.status === 'CONFLICT' ? 'En Conflicto' : 'Graduado'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                                        <div className="bg-slate-50/80 p-6 rounded-lg border border-slate-100 flex flex-col justify-center items-center">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Asistencia Global</label>
                                                            <AttendanceBadge count={prog.attendanceCount} total={prog.totalSessions} />
                                                        </div>
                                                        <div className="bg-slate-50/80 p-6 rounded-lg border border-slate-100 flex flex-col justify-center items-center text-center">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Registro de Pago</label>
                                                            {prog.paymentInfo ? (
                                                                <>
                                                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-sm text-[11px] font-bold uppercase tracking-wider border ${prog.paymentInfo.status === 'Pagado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                        {prog.paymentInfo.status === 'Pagado' ? '✅ Pagado' : '⏳ Pendiente'}
                                                                    </span>
                                                                    <span className="text-xs text-slate-600 font-bold mt-3">${prog.paymentInfo.amount?.toLocaleString()} • {prog.paymentInfo.method.replace('Mercado Pago', 'MP').replace('Transferencia', 'Transf.')}</span>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-xs text-slate-300 font-bold uppercase py-1">Sin información</span>
                                                                    <span className="text-[9px] text-slate-400 italic mt-1">No hay pagos vinculados a este ciclo</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Advanced Notes Section */}
                                                    <div>
                                                        <div className="flex justify-between items-end mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bitácora de Notas del Staff</h4>
                                                            </div>
                                                            <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-sm">{programNotes.length} Notas</span>
                                                        </div>

                                                        {/* Add New Note */}
                                                        <div className="bg-yellow-50/50 border border-yellow-200/50 p-4 rounded-lg mb-6 shadow-sm">
                                                            <textarea 
                                                                className="w-full p-4 bg-white border border-yellow-200 rounded-md text-sm text-slate-700 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-amber-200 placeholder-slate-400 leading-relaxed resize-none"
                                                                placeholder={`Escribir nueva nota sobre el desempeño de ${student.name.split(' ')[0]}...`}
                                                                value={newNoteContent}
                                                                onChange={(e) => setNewNoteContent(e.target.value)}
                                                            ></textarea>
                                                            <div className="flex justify-end mt-3">
                                                                <button
                                                                    onClick={() => handleAddNote(prog.id)}
                                                                    disabled={isSavingNote || !newNoteContent.trim()}
                                                                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors shadow-sm"
                                                                >
                                                                    {isSavingNote ? 'Guardando...' : '+ Guardar Nota'}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Note History List */}
                                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                                            {isLoadingNotes ? (
                                                                <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 py-6">Cargando bitácora...</p>
                                                            ) : programNotes.length === 0 ? (
                                                                <div className="text-center py-8 border border-dashed border-slate-200 rounded-md bg-slate-50">
                                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Sin notas registradas</p>
                                                                    <p className="text-xs text-slate-400 mt-1">Todavía no hay observaciones para este programa.</p>
                                                                </div>
                                                            ) : (
                                                                programNotes.map(note => (
                                                                    <div key={note.id} className="p-4 bg-white border border-slate-200 rounded-md hover:border-blue-100 transition-colors shadow-sm ml-4 relative">
                                                                        {/* Timeline Dot */}
                                                                        <div className="absolute -left-[21px] top-5 w-2 h-2 rounded-full bg-slate-200 ring-4 ring-white"></div>
                                                                        <div className="absolute -left-[20px] top-6 bottom-[-20px] w-0.5 bg-slate-100 last:hidden z-[-1]"></div>
                                                                        
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                                                {new Date(note.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} hs
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="p-10 bg-slate-50 border border-slate-100 rounded-md text-center">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay historial de programas.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── TAB: CARTA DE ENROLAMIENTO (SYSADMIN) ──────────────────── */}
                            {detailTab === 'CARTA' && (
                                <div className="space-y-8">
                                    {!plEnrollment ? (
                                        <div className="py-16 text-center bg-slate-50 border border-dashed border-slate-200 rounded-sm">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sin etapa PL activa</p>
                                            <p className="text-xs text-slate-400 mt-1">El alumno no tiene un enrollment en Plan Líder.</p>
                                        </div>
                                    ) : isLoadingCarta ? (
                                        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin" /></div>
                                    ) : (
                                        <>
                                            {/* Identidad */}
                                            <div className="bg-purple-50 border border-purple-100 rounded-sm p-1">
                                                <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest px-4 pt-3 pb-1">Identidad & Contrato</p>
                                                <div className="p-4 space-y-4">
                                                    {[{key: 'contrato', label: 'Yo soy...'}, {key: 'estiramiento', label: 'Mi estiramiento es...'}, {key: 'nabo_descripcion', label: 'Mi patrón limitante (Nabo)'}, {key: 'equipo_asistencia', label: 'El equipo me ayuda a...'}].map(f => (
                                                        <div key={f.key}>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{f.label}</p>
                                                            <textarea
                                                                rows={2}
                                                                className="w-full p-3 bg-white border border-slate-200 rounded-sm text-sm text-slate-700 focus:outline-none focus:border-purple-400 resize-none"
                                                                value={cartaDraft[f.key] || ''}
                                                                onChange={e => setCartaDraft((p: any) => ({...p, [f.key]: e.target.value}))}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Metas por área */}
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Metas por Área de Vida</p>
                                                <div className="space-y-4">
                                                    {GOAL_AREAS.map(area => {
                                                        const areaData = (cartaDraft.goals_data || {})[area.key] || {goal: '', purpose: '', actions: [], metrics: ''};
                                                        return (
                                                            <div key={area.key} className="border border-slate-100 rounded-sm overflow-hidden">
                                                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                                                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{area.label}</p>
                                                                </div>
                                                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    {[{k:'goal', l:'Meta'}, {k:'purpose', l:'Para qué'}, {k:'metrics', l:'Métrica'}].map(f2 => (
                                                                        <div key={f2.k} className={f2.k === 'metrics' ? 'md:col-span-2' : ''}>
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{f2.l}</p>
                                                                            <input
                                                                                type="text"
                                                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-purple-400"
                                                                                value={areaData[f2.k] || ''}
                                                                                onChange={e => setCartaDraft((p: any) => ({
                                                                                    ...p,
                                                                                    goals_data: {...(p.goals_data || {}), [area.key]: {...areaData, [f2.k]: e.target.value}}
                                                                                }))}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex justify-end">
                                                <button
                                                    onClick={saveCarta}
                                                    disabled={isSavingCarta}
                                                    className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all shadow-lg shadow-purple-200"
                                                >
                                                    {isSavingCarta ? 'Guardando...' : '💾 Guardar Carta'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── TAB: PLANILLA MAGNA (SYSADMIN) ──────────────────────── */}
                            {detailTab === 'PLANILLA_PL' && (
                                <div>
                                    {!plEnrollment ? (
                                        <div className="py-16 text-center bg-slate-50 border border-dashed border-slate-200 rounded-sm">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sin etapa PL activa</p>
                                        </div>
                                    ) : isLoadingCheckins ? (
                                        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin" /></div>
                                    ) : (
                                        <div className="space-y-3 overflow-x-auto">
                                          <div className="min-w-[560px] space-y-3">
                                            <div className="grid grid-cols-7 gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest px-3">
                                                <span className="col-span-1">Semana</span>
                                                {GOAL_AREAS.map(a => <span key={a.key} className="text-center">{a.label.slice(0,4)}.</span>)}
                                                <span className="text-right">Promedio</span>
                                            </div>
                                            {Array.from({length: 13}, (_, i) => i + 1).map(week => {
                                                const existing = checkins.find(c => c.week_number === week);
                                                const scores = existing?.scores || {};
                                                const avg = GOAL_AREAS.length
                                                    ? Math.round(GOAL_AREAS.reduce((s, a) => s + (scores[a.key] || 0), 0) / GOAL_AREAS.length)
                                                    : 0;
                                                const isEditing = editingWeek === week;
                                                return (
                                                    <div key={week} className={`border rounded-sm transition-all ${isEditing ? 'border-purple-300 bg-purple-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                        {isEditing ? (
                                                            <div className="p-4 space-y-3">
                                                                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Semana {week} — Ingreso de Porcentajes</p>
                                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                                                    {GOAL_AREAS.map(area => (
                                                                        <div key={area.key}>
                                                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{area.label}</p>
                                                                            <div className="flex items-center gap-1">
                                                                                <input
                                                                                    type="number" min={0} max={100}
                                                                                    className="w-full p-2 border border-slate-200 rounded-sm text-sm text-center focus:outline-none focus:border-purple-400"
                                                                                    value={weekDraft[area.key] ?? (scores[area.key] || 0)}
                                                                                    onChange={e => setWeekDraft(p => ({...p, [area.key]: parseInt(e.target.value) || 0}))}
                                                                                />
                                                                                <span className="text-[10px] text-slate-400">%</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="flex justify-end gap-3">
                                                                    <button onClick={() => setEditingWeek(null)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancelar</button>
                                                                    <button onClick={() => saveWeekCheckin(week)} disabled={isSavingCheckin} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-50">{isSavingCheckin ? 'Guardando...' : 'Guardar'}</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button className="w-full grid grid-cols-7 gap-1 px-3 py-3 items-center text-left" onClick={() => { setEditingWeek(week); setWeekDraft(scores); }}>
                                                                <span className="text-[10px] font-bold text-slate-700 col-span-1">Sem. {week}</span>
                                                                {GOAL_AREAS.map(a => (
                                                                    <span key={a.key} className={`text-center text-[11px] font-bold ${(scores[a.key] || 0) >= 70 ? 'text-emerald-600' : (scores[a.key] || 0) >= 40 ? 'text-amber-600' : existing ? 'text-red-500' : 'text-slate-300'}`}>
                                                                        {existing ? `${scores[a.key] || 0}%` : '—'}
                                                                    </span>
                                                                ))}
                                                                <span className={`text-right text-[11px] font-black ${existing ? (avg >= 70 ? 'text-emerald-600' : avg >= 40 ? 'text-amber-600' : 'text-red-500') : 'text-slate-200'}`}>
                                                                    {existing ? `${avg}%` : '+'}
                                                                </span>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                          </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── TAB: CAMPUS BETA (SYSADMIN) ─────────────────────────── */}
                            {detailTab === 'CAMPUS' && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-sm">
                                        <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="text-xs font-bold text-purple-700">Campus Digital en desarrollo. Esta sección contendrá el acceso a los 13 meses de seguimiento post-PL con videos, PDFs y acompañamiento mensual.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {Array.from({length: 13}, (_, i) => i + 1).map(month => (
                                            <div key={month} className="border border-dashed border-slate-200 rounded-sm p-6 text-center bg-slate-50 opacity-40">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-3">
                                                    <span className="text-xs font-black text-slate-500">{month}</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mes {month}</p>
                                                <p className="text-[9px] text-slate-300 mt-1">Próximamente</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {detailTab === 'METAS' && (
                                <div>
                                    <div className="flex justify-end mb-8">
                                        <button className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-sm hover:bg-black transition-all shadow-md">
                                            + Registrar Nueva Meta
                                        </button>
                                    </div>
                                    {isLoadingGoals ? (
                                        <p className="text-center text-slate-400 py-10 font-bold uppercase tracking-widest text-[10px]">Cargando metas...</p>
                                    ) : studentGoals.length === 0 ? (
                                        <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-md flex flex-col items-center">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-sm text-slate-300">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                            </div>
                                            <p className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-2">Sin metas registradas</p>
                                            <p className="text-xs text-slate-400 max-w-sm mx-auto">El alumno no ha definido metas para su Plan Líder actual o no está inscripto en un programa de seguimiento.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {studentGoals.map(goal => (
                                                <div key={goal.id} className="border border-slate-100 rounded-sm p-6 bg-white shadow-sm flex gap-6 hover:border-blue-200 transition-colors">
                                                    <div className={`mt-1 w-10 h-10 rounded-sm flex items-center justify-center border ${goal.status === 'achieved' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                                                        <CheckIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className={`font-bold text-slate-800 text-base leading-relaxed ${goal.status === 'achieved' ? 'line-through opacity-40' : ''}`}>
                                                                {goal.goal_description}
                                                            </h5>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 px-3 py-1 bg-slate-50 border rounded-sm">{goal.target_date || 'Sin fecha'}</span>
                                                        </div>
                                                        {goal.staff_feedback && (
                                                            <div className="mt-5 bg-blue-50/50 p-4 border-l-2 border-blue-400 rounded-r-sm text-sm text-blue-800">
                                                                <span className="font-bold uppercase text-[9px] block mb-2 opacity-60 tracking-widest">Respuesta / Feedback de Staff</span>
                                                                {goal.staff_feedback}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Standard Field Render Logic */}
                            {['PERSONAL', 'MOTIVACIÓN', 'SALUD', 'OTROS'].includes(detailTab) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                    {(() => {
                                        const dictionaries: Record<string, Record<string, string>> = {
                                            'PERSONAL': {
                                                'firstName': 'Nombre', 'lastName': 'Apellido', 'preferredName': '¿Cómo te llaman?', 'email': 'Correo Electrónico',
                                                'phone': 'Teléfono', 'age': 'Edad', 'dni': 'DNI',
                                                'address': 'Dirección', 'occupation': 'Ocupación', 'birthDate': 'Fecha de Nac.',
                                                'gender': 'Género', 'instagram': 'Instagram'
                                            },
                                            'MOTIVACIÓN': {
                                                'intention': '¿Qué querés llevarte?',
                                                'dream1': 'Sueño Principal', 'dream2': 'Segundo Sueño', 'dream3': 'Tercer Sueño',
                                                'referredBy': '¿Quién te invitó?',
                                                'qualities': 'Cualidades', 'context': 'Contexto actual',
                                                'dailyRoutine': 'Un día tuyo', 'energyLeaks': 'Fugas de energía', 'lifeHistory': 'Historia de vida'
                                            },
                                            'SALUD': {
                                                'underTreatment': 'Bajo Tratamiento', 'underTreatmentDetails': 'Detalles del Tratamiento',
                                                'psychiatricTreatment': 'Tratamiento Psiquiátrico', 'chronicDisease': 'Enfermedad Crónica',
                                                'healthIssue': 'Problemas de salud', 'medication': 'Medicación',
                                                'allergies': 'Alergias / Condiciones', 'emergencyContact': 'Contacto de Emerg.',
                                                'medicalNotes': 'Notas Médicas', 'specialConditions': 'Condiciones Especiales',
                                                'pregnant': '¿Embarazo?', 'bloodType': 'Grupo Sanguíneo',
                                                'alcoholAbuse': 'Consumo de Alcohol', 'emergencyName': 'Nombre de Emergencia',
                                                'emergencyPhone': 'Teléfono de Emergencia', 'drugConsumption': 'Consumo de Sustancias',
                                                'allergiesDetails': 'Detalle de Alergias', 'honestDeclaration': 'Declaración Jurada Confirmada',
                                                'smoke': '¿Fuma?'
                                            }
                                        };

                                        const dict = dictionaries[detailTab];
                                        let itemsToRender: { label: string, val: string }[] = [];

                                        const formData = student.formData || {};
                                        const medData = student.medicalInfo || null;

                                        if (dict) {
                                            itemsToRender = Object.entries(dict).map(([key, label]) => {
                                                let val = formData[key] as string;
                                                
                                                // Specific overrides for consistent display
                                                if (key === 'phone') val = formData.phone || student.phone;
                                                if (key === 'email') val = formData.email || student.email;
                                                
                                                // Medical Tab Overrides
                                                if (detailTab === 'SALUD') {
                                                    if (medData) {
                                                        if (key === 'underTreatment') val = medData.under_treatment ? 'Sí' : 'No';
                                                        if (key === 'underTreatmentDetails') val = medData.treatment_details;
                                                        if (key === 'medication') val = medData.medication;
                                                        if (key === 'allergies') val = medData.allergies;
                                                        if (key === 'emergencyContact') val = medData.emergency_contact_name ? `${medData.emergency_contact_name} - ${medData.emergency_contact_phone || ''}` : '';
                                                    } else {
                                                        // Fallback to formData
                                                        if (key === 'emergencyContact') val = formData.emergencyName ? `${formData.emergencyName} - ${formData.emergencyPhone || ''}` : '';
                                                    }
                                                }

                                                return { label, val: val || '' };
                                            });
                                        } else if (detailTab === 'OTROS') {
                                            const allKnownKeys = Object.values(dictionaries).flatMap(d => Object.keys(d));
                                            itemsToRender = Object.entries(formData)
                                                .filter(([k]) => !allKnownKeys.includes(k) && k !== 'id' && k !== 'created_at' && k !== 'form_id')
                                                .map(([k, v]) => ({
                                                    label: k.replace(/([A-Z])/g, ' $1').toUpperCase().trim(),
                                                    val: String(v) || ''
                                                }));
                                        }

                                        // Filter out entirely empty items to keep the view clean, unless we're forcing empty states
                                        // Wait, user prefers EMPTY state saying "Información no proporcionada" instead of collapsing it completely.
                                        // But for mapping we'll render all requested keys.

                                        if (itemsToRender.length === 0 && detailTab === 'OTROS') {
                                            return (
                                                <div className="md:col-span-2 py-24 text-center flex flex-col items-center border border-dashed border-slate-100 rounded-sm">
                                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                                        <svg className="w-6 h-6 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">No hay datos extra</p>
                                                </div>
                                            );
                                        }

                                        return itemsToRender.map((item, idx) => {
                                            const isNegative = typeof item.val === 'string' && (
                                                item.val.toLowerCase() === 'no' || 
                                                item.val.toLowerCase() === 'no aplica' || 
                                                item.val.toLowerCase() === 'ninguno'
                                            );
                                            
                                            return (
                                                <div key={idx} className={`group ${item.val?.length > 70 ? 'md:col-span-2' : ''}`}>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 group-hover:text-blue-600 transition-colors">
                                                        {item.label}
                                                    </p>
                                                    <div className={`p-4 border rounded-sm transition-all min-h-[50px] flex items-center ${
                                                        isNegative 
                                                            ? 'bg-slate-50 border-slate-100 opacity-60' 
                                                            : 'bg-white border-slate-100 group-hover:border-blue-100 group-hover:bg-white'
                                                    }`}>
                                                        <p className={`text-sm leading-relaxed font-medium ${isNegative ? 'text-slate-400' : 'text-slate-700'}`}>
                                                            {item.val ? (
                                                                isNegative ? <span className="font-bold tracking-tight">NO APLICA</span> : item.val
                                                            ) : (
                                                                <span className="text-slate-300 italic text-xs">Información no proporcionada</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 flex justify-between items-center border-t border-slate-100 z-10">
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Cerrar</button>
                    </div>
                    
                    <div className="flex gap-4">
                        {student.is_deleted ? (
                            <>
                                {onPermanentDelete && (
                                    <button onClick={() => onPermanentDelete(student)} className="px-6 py-3 text-red-500 hover:bg-red-50 font-bold text-xs uppercase tracking-widest rounded-sm transition-all border border-transparent hover:border-red-100">
                                        Eliminar Definitivamente
                                    </button>
                                )}
                                {onRestore && (
                                    <button onClick={() => onRestore(student.id)} className="px-8 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">
                                        Restaurar Alumno
                                    </button>
                                )}
                            </>
                        ) : (
                            onSoftDelete && (
                                <button onClick={() => onSoftDelete(student.id)} className="px-6 py-3 text-red-500 hover:bg-red-50 font-bold text-xs uppercase tracking-widest rounded-sm transition-all border border-transparent hover:border-red-100">
                                    Enviar a Papelera
                                </button>
                            )
                        )}
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default StudentDetailModal;
