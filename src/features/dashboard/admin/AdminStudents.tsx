import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../services/supabaseClient';
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

    useEffect(() => { fetchStudents(); fetchTrashCount(); }, [viewMode]);

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

    const fetchTrashCount = async () => {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('is_deleted', true);
        if (count !== null) setTrashCount(count);
    };

    const fetchStudents = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id, first_name, last_name, email, phone, is_deleted,
                enrollments!inner (
                    id, status, payment_status,
                    cycle:cycles ( id, name, type ),
                    attendance ( id, status ),
                    payments ( amount, method, status, paid_at )
                )
            `)
            .eq('role', 'student')
            .eq('is_deleted', viewMode === 'trash');

        if (error) { console.error('Error:', error); return; }

        const emails = data.map((p: any) => p.email).filter(Boolean);
        const { data: submissions } = await supabase.from('form_submissions').select('email, data').in('email', emails);
        const submissionsMap = (submissions || []).reduce((acc: any, c: any) => { acc[c.email] = c.data; return acc; }, {});

        const profileIds = data.map((p: any) => p.id);
        const { data: medicalData } = await supabase.from('medical_info').select('*').in('user_id', profileIds);
        const medicalMap = (medicalData || []).reduce((acc: any, c: any) => { acc[c.user_id] = c; return acc; }, {});

        const cycleIds = data.flatMap((p: any) => p.enrollments?.map((e: any) => e.cycle?.id)).filter(Boolean);
        let sessionsMap: Record<string, number> = {};
        if (cycleIds.length > 0) {
            const { data: sessions } = await supabase.from('cycle_sessions').select('cycle_id').in('cycle_id', cycleIds);
            sessionsMap = (sessions || []).reduce((acc: any, s: any) => { acc[s.cycle_id] = (acc[s.cycle_id] || 0) + 1; return acc; }, {});
        }

        const formatted: StudentForModal[] = data.map((p: any) => {
            const history: any[] = (p.enrollments || []).map((e: any) => {
                const attCount = e.attendance?.filter((a: any) => ['present', 'late'].includes(a.status)).length || 0;
                const cId = e.cycle?.id;
                const totalSess = cId ? (sessionsMap[cId] || 0) : 0;
                const pay = e.payments?.[0];
                
                // Dynamic CONFLICT logic
                const startDate = e.cycle?.start_date || '9999-12-31';
                const isOverdue = new Date(startDate) < new Date() && e.payment_status !== 'paid';
                let derivedStatus: 'ACTIVE' | 'CONFLICT' | 'GRADUATED' = 'ACTIVE';
                
                if (e.status === 'conflict' || isOverdue) {
                    derivedStatus = 'CONFLICT';
                } else if (e.status === 'graduated') {
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
        fetchTrashCount();
    };

    const handleSoftDelete = async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('profiles').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id || null }).eq('id', id);
        fetchStudents(); setSelectedStudent(null);
    };

    const handleRestore = async (id: string) => {
        await supabase.from('profiles').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', id);
        fetchStudents(); setSelectedStudent(null);
    };

    const handlePermanentDelete = async () => {
        if (!studentToDelete) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
      if (!['admin', 'sysadmin', 'super_admin'].includes(profile?.role)) { toast.error('Sin permisos.'); return; }
        await supabase.from('profiles').delete().eq('id', studentToDelete.id);
        setIsConfirmDeleteOpen(false); setStudentToDelete(null); setSelectedStudent(null); fetchStudents();
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

                <div className="flex-1 overflow-y-auto">
                    <table className="formal-table">
                        <thead>
                            <tr>
                                <th>Alumno</th>
                                <th>Etapa Actual</th>
                                <th>Estado</th>
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
        </>
    );
};

export default AdminStudents;
