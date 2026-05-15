import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../services/supabaseClient';
import { restSelect, restUpdate, restDelete, getCurrentUserId } from '../../../services/supabaseRest';
import TrashIcon from '../../../ui/icons/TrashIcon';
import StudentDetailModal, { StudentForModal, AttendanceBadge } from './StudentDetailModal';
import toast from 'react-hot-toast';
interface AdminStudentsProps {
    role?: 'admin' | 'sysadmin';
}

const AdminStudents: React.FC<AdminStudentsProps> = ({ role = 'admin' }) => {
    const [students, setStudents] = useState<StudentForModal[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [selectedStudent, setSelectedStudent] = useState<StudentForModal | null>(null);
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    const [trashCount, setTrashCount] = useState(0);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<StudentForModal | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasLoadedOnceRef = useRef(false);

    const fetchTrashCount = useCallback(async () => {
        try {
            const { count } = await restSelect('profiles', {
                filters: { role: 'eq.student', is_deleted: 'eq.true' },
                count: 'exact',
                head: true,
            });
            if (count !== null) setTrashCount(count);
        } catch (err) {
            console.error('Error fetching trash count:', err);
        }
    }, []);

    const fetchData = useCallback(async (isBackgroundRefresh = false) => {
        const isFirstLoad = !hasLoadedOnceRef.current || !isBackgroundRefresh;
        if (isFirstLoad && students.length === 0) setIsLoading(true);

        try {
            const { data } = await restSelect<any>('profiles', {
                columns: 'id,user_id,first_name,last_name,email,phone,is_deleted,enrollments(id,status,payment_status,cycle:cycles(id,name,type,start_date),attendance(id,status),payments(amount,method,status,paid_at))',
                filters: {
                    role: 'eq.student',
                    is_deleted: `eq.${viewMode === 'trash'}`,
                },
            });

            if (data) {
                const emails = data.map((p: any) => p.email).filter(Boolean);
                const profileIds = data.map((p: any) => p.id);
                const cycleIds = data.flatMap((p: any) => p.enrollments?.map((e: any) => e.cycle?.id)).filter(Boolean);

                const [submissionsRes, medicalRes, sessionsRes] = await Promise.all([
                    emails.length > 0
                        ? restSelect<any>('form_submissions', { columns: 'email,data', filters: { email: `in.(${emails.map(e => `"${e}"`).join(',')})` } })
                        : Promise.resolve({ data: [], count: null }),
                    profileIds.length > 0
                        ? restSelect<any>('medical_info', { filters: { user_id: `in.(${profileIds.join(',')})` } })
                        : Promise.resolve({ data: [], count: null }),
                    cycleIds.length > 0
                        ? restSelect<any>('cycle_sessions', { columns: 'cycle_id', filters: { cycle_id: `in.(${cycleIds.join(',')})` } })
                        : Promise.resolve({ data: [], count: null }),
                ]);

                const submissionsMap = (submissionsRes.data || []).reduce((acc: any, c: any) => { acc[c.email] = c.data; return acc; }, {});
                const medicalMap = (medicalRes.data || []).reduce((acc: any, c: any) => { acc[c.user_id] = c; return acc; }, {});
                const sessionsMap = (sessionsRes.data || []).reduce((acc: any, s: any) => { acc[s.cycle_id] = (acc[s.cycle_id] || 0) + 1; return acc; }, {});

                const formatted: StudentForModal[] = data.map((p: any) => {
                    const history: any[] = (p.enrollments || []).map((e: any) => {
                        const attCount = e.attendance?.filter((a: any) => ['present', 'late'].includes(a.status)).length || 0;
                        const cId = e.cycle?.id;
                        const totalSess = cId ? (sessionsMap[cId] || 0) : 0;
                        const pay = e.payments?.[0];
                        
                        const startDate = e.cycle?.start_date || '9999-12-31';
                        const isOverdue = e.status === 'active' && e.payment_status !== 'paid';
                        let derivedStatus: 'ACTIVE' | 'CONFLICT' | 'GRADUATED' = 'ACTIVE';

                        if (e.status === 'conflict' || isOverdue) {
                            derivedStatus = 'CONFLICT';
                        } else if (e.status === 'graduated' || e.status === 'completed') {
                            derivedStatus = 'GRADUATED';
                        }

                        return {
                            id: e.id,
                            cycleName: e.cycle?.name || 'Desconocido',
                            cycleType: e.cycle?.type || 'initial',
                            status: derivedStatus,
                            attendanceCount: attCount,
                            totalSessions: totalSess,
                            paymentInfo: pay ? {
                                amount: pay.amount,
                                method: pay.method === 'mercadopago' ? 'Mercado Pago' : (pay.method === 'transfer' ? 'Transferencia' : 'Efectivo'),
                                status: pay.status === 'paid' ? 'Pagado' : (e.payment_status === 'paid' ? 'Pagado' : 'Pendiente'),
                                paidAt: pay.paid_at ? new Date(pay.paid_at).toLocaleDateString() : '-'
                            } : null,
                            notes: e.notes || '',
                            startDate: startDate
                        };
                    }).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

                    return {
                        id: p.id,
                        user_id: p.user_id,
                        name: `${p.first_name} ${p.last_name}`,
                        email: p.email,
                        phone: p.phone || submissionsMap[p.email]?.phone || '-',
                        programHistory: history,
                        formData: submissionsMap[p.email] || {},
                        medicalInfo: medicalMap[p.id] || null,
                        is_deleted: p.is_deleted
                    };
                });
                
                setStudents(formatted);
                hasLoadedOnceRef.current = true;
            }
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setIsLoading(false);
            fetchTrashCount();
        }
    }, [viewMode, fetchTrashCount, students.length]);

    useEffect(() => { 
        fetchData(); 
        fetchTrashCount(); 

        const channelName = `students_changes_${viewMode}`;
        const channel = supabase.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => fetchData(true))
            .subscribe();

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchData(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [viewMode, fetchData, fetchTrashCount]);
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedStudent(null);
                setIsConfirmDeleteOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // --- Invite State ---
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [studentToInvite, setStudentToInvite] = useState<StudentForModal | null>(null);
    const [inviteMode, setInviteMode] = useState<'magic_link' | 'password'>('magic_link');
    const [invitePassword, setInvitePassword] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    const handleOpenInvite = (student: StudentForModal) => {
        setStudentToInvite(student);
        setInviteMode('magic_link');
        setInvitePassword('');
        setIsInviteModalOpen(true);
    };

    const handleInviteSubmit = async () => {
        if (!studentToInvite) return;
        setIsInviting(true);
        try {
            const [firstName, ...lastNameParts] = studentToInvite.name.split(' ');
            const lastName = lastNameParts.join(' ');
            
            const res = await fetch('/api/admin/create-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: studentToInvite.email,
                    mode: inviteMode,
                    password: inviteMode === 'password' ? invitePassword : null,
                    firstName,
                    lastName
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al crear credenciales');

            toast.success(inviteMode === 'magic_link' ? 'Magic Link enviado por email' : 'Credenciales creadas correctamente');
            setIsInviteModalOpen(false);
            fetchData(true); // reload to get the new user_id
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsInviting(false);
        }
    };

    const handleSoftDelete = async (id: string) => {
        try {
            setIsSubmitting(true);
            const userId = getCurrentUserId();
            await restUpdate('profiles', {
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: userId,
            }, { id: `eq.${id}` });

            // Sacarlo del listado actual (la query carga solo is_deleted = viewMode === 'trash')
            setStudents(prev => prev.filter(s => s.id !== id));
            setSelectedStudent(null);
            fetchTrashCount();
            toast.success('Movido a papelera');
        } catch (error: any) {
            toast.error('Error al borrar: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRestore = async (id: string) => {
        try {
            setIsSubmitting(true);
            await restUpdate('profiles', {
                is_deleted: false,
                deleted_at: null,
                deleted_by: null,
            }, { id: `eq.${id}` });

            // Sacarlo del listado actual (la query de papelera carga solo is_deleted = true)
            setStudents(prev => prev.filter(s => s.id !== id));
            setSelectedStudent(null);
            fetchTrashCount();
            toast.success('Restaurado correctamente');
        } catch (error: any) {
            toast.error('Error al restaurar: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePermanentDelete = async () => {
        if (!studentToDelete) return;
        try {
            setIsSubmitting(true);
            // El middleware ya valida que el usuario sea admin antes de llegar acá.
            // RLS en la DB también bloquea deletes de no-admin.
            await restDelete('profiles', { id: `eq.${studentToDelete.id}` });

            setStudents(prev => prev.filter(s => s.id !== studentToDelete.id));
            setIsConfirmDeleteOpen(false);
            setStudentToDelete(null);
            setSelectedStudent(null);
            toast.success('Eliminado definitivamente');
        } catch (error: any) {
            toast.error('Error al eliminar definitivamente: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const term = searchTerm.toLowerCase();
        const latestProg = s.programHistory?.[0];
        const status = latestProg?.status || 'GRADUATED'; // Default if none
        return (s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)) &&
            (statusFilter === 'ALL' || status === statusFilter);
    });

    return (
        <>
            <div className="formal-card overflow-hidden animate-fade-in-up h-full flex flex-col">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-bold text-slate-800">{viewMode === 'active' ? 'Gestión de Alumnos' : 'Papelera'}</h3>
                        {viewMode === 'active' ? (
                            <button onClick={() => setViewMode('trash')} className="p-2 text-slate-300 hover:text-red-500 transition-colors relative" title="Papelera">
                                <TrashIcon className="w-4 h-4" />
                                {trashCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">{trashCount}</span>}
                            </button>
                        ) : (
                            <button onClick={() => setViewMode('active')} className="px-3 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-sm transition-colors uppercase tracking-wider">Volver</button>
                        )}
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="formal-search-container relative">
                            <input type="text" placeholder="Buscar por nombre o email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="formal-search-input pr-10" />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                                    ✕
                                </button>
                            )}
                        </div>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold uppercase text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400">
                            <option value="ALL">TODOS</option>
                            <option value="ACTIVE">ACTIVOS</option>
                            <option value="CONFLICT">EN CONFLICTO</option>
                            <option value="GRADUATED">GRADUADOS</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {isLoading && students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                             <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
                             <p className="text-sm font-medium">Cargando alumnos...</p>
                        </div>
                    ) : (
                        <table className="formal-table min-w-[640px]">
                        <thead>
                            <tr>
                                <th>Alumno</th>
                                <th>Etapa Actual</th>
                                <th>Estado</th>
                                <th className="text-center">Campus</th>
                                <th className="text-center">Asistencia</th>
                                <th className="text-center">Pago</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student) => {
                                const latestProg = student.programHistory?.[0];
                                const currentPackage = latestProg?.cycleName || 'Sin Asignar';
                                const status = latestProg?.status || 'GRADUATED';
                                return (
                                <tr key={student.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${status === 'CONFLICT' ? 'bg-rose-50/50' : ''}`} onClick={() => setSelectedStudent(student)}>
                                    <td>
                                        <div className="font-bold text-slate-800">{student.name}</div>
                                        <div className="flex items-center gap-2 mt-0.5 group/copy">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{student.email}</div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(student.email); toast.success('Email copiado'); }}
                                                className="opacity-0 group-hover/copy:opacity-100 p-1 hover:bg-slate-100 rounded-sm transition-all"
                                                title="Copiar Email"
                                            >
                                                <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="px-2 py-1 rounded-sm text-[10px] font-bold border bg-blue-50 border-blue-200 text-blue-700 uppercase tracking-wider">{currentPackage}</span>
                                    </td>
                                    <td>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : status === 'CONFLICT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
                                            {status === 'ACTIVE' ? 'CURSANDO' : status === 'CONFLICT' ? 'CONFLICTO' : 'GRADUADO'}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        {student.user_id ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">✅ ACCESO ACTIVO</span>
                                        ) : (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleOpenInvite(student); }}
                                                className="inline-flex items-center px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
                                            >
                                                + Habilitar Acceso
                                            </button>
                                        )}
                                    </td>
                                    <td className="text-center"><AttendanceBadge count={latestProg?.attendanceCount || 0} total={latestProg?.totalSessions || 0} /></td>
                                    <td className="text-center">
                                        {latestProg?.paymentInfo ? (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${latestProg.paymentInfo.status === 'Pagado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                {latestProg.paymentInfo.status === 'Pagado' ? '✅' : '⏳'} {latestProg.paymentInfo.status}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 font-bold uppercase">Sin registro</span>
                                        )}
                                    </td>
                                </tr>
                                )
                            })}
                            {filteredStudents.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-12 text-slate-400 italic text-sm">No se encontraron alumnos.</td></tr>
                            )}
                        </tbody>
                    </table>
                    )}
                </div>
            </div>

            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    role={role}
                    onClose={() => setSelectedStudent(null)}
                    onSoftDelete={handleSoftDelete}
                    onRestore={handleRestore}
                    onPermanentDelete={(s) => { setStudentToDelete(s); setIsConfirmDeleteOpen(true); }}
                />
            )}

            {isConfirmDeleteOpen && studentToDelete && createPortal(
                <div className="full-screen-modal-overlay z-[70]" onClick={() => setIsConfirmDeleteOpen(false)}>
                    <div className="formal-modal max-w-md w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><TrashIcon className="w-8 h-8" /></div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar definitivamente?</h3>
                            <p className="text-sm text-slate-500 mb-8">Borrar permanentemente a <strong>{studentToDelete.name}</strong>. No se puede deshacer.</p>
                            <div className="flex gap-4 w-full">
                                <button onClick={() => setIsConfirmDeleteOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-slate-200 transition-all">Cancelar</button>
                                <button onClick={handlePermanentDelete} className="flex-1 py-3 bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-all">Eliminar</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isInviteModalOpen && studentToInvite && createPortal(
                <div className="full-screen-modal-overlay z-[70]" onClick={() => setIsInviteModalOpen(false)}>
                    <div className="formal-modal max-w-md w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Habilitar Acceso al Campus</h3>
                            <p className="text-sm text-slate-500 mb-6">Vas a crear la cuenta de <strong>{studentToInvite.name}</strong> ({studentToInvite.email}).</p>
                            
                            <div className="space-y-4 mb-6">
                                <label className={`flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors ${inviteMode === 'magic_link' ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-slate-50'}`}>
                                    <input type="radio" name="inviteMode" checked={inviteMode === 'magic_link'} onChange={() => setInviteMode('magic_link')} className="mt-1" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Enviar enlace mágico</p>
                                        <p className="text-xs text-slate-500 mt-1">El alumno recibirá un email con un botón para crear su propia contraseña.</p>
                                    </div>
                                </label>
                                
                                <label className={`flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors ${inviteMode === 'password' ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-slate-50'}`}>
                                    <input type="radio" name="inviteMode" checked={inviteMode === 'password'} onChange={() => setInviteMode('password')} className="mt-1" />
                                    <div className="w-full">
                                        <p className="text-sm font-bold text-slate-800">Crear contraseña manualmente</p>
                                        <p className="text-xs text-slate-500 mt-1 mb-3">Vos le pasas la contraseña por privado.</p>
                                        {inviteMode === 'password' && (
                                            <input 
                                                type="text" 
                                                placeholder="Mínimo 6 caracteres" 
                                                value={invitePassword}
                                                onChange={e => setInvitePassword(e.target.value)}
                                                className="w-full p-2 text-sm border rounded-sm"
                                            />
                                        )}
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-4 w-full">
                                <button onClick={() => setIsInviteModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-sm hover:bg-slate-200 transition-all">Cancelar</button>
                                <button onClick={handleInviteSubmit} disabled={isInviting || (inviteMode === 'password' && invitePassword.length < 6)} className="flex-1 py-3 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all">
                                    {isInviting ? 'Procesando...' : 'Confirmar'}
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

export default AdminStudents;
