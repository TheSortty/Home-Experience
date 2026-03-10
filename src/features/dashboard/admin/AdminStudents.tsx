import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../services/supabaseClient';
import CheckIcon from '../../../ui/icons/CheckIcon';
import TrashIcon from '../../../ui/icons/TrashIcon';
import UsersIcon from '../../../ui/icons/UsersIcon';

interface Student {
    id: string;
    name: string;
    email: string;
    phone: string;
    currentPackage: string;
    packageType: 'initial' | 'advanced' | 'plan_lider' | string;
    status: 'ACTIVE' | 'CONFLICT' | 'GRADUATED';
    attendanceCount: number;
    formData: any;
    is_deleted?: boolean;
}

interface Goal {
    id: string;
    goal_description: string;
    target_date: string;
    status: 'pending' | 'achieved';
    staff_feedback: string;
}

const AdminStudents: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'goals'>('info');
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    const [trashCount, setTrashCount] = useState(0);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

    // Goals State
    const [studentGoals, setStudentGoals] = useState<Goal[]>([]);
    const [isLoadingGoals, setIsLoadingGoals] = useState(false);

    useEffect(() => {
        fetchStudents();
        fetchTrashCount();
    }, [viewMode]);

    const fetchTrashCount = async () => {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student')
            .eq('is_deleted', true);

        if (!error && count !== null) {
            setTrashCount(count);
        }
    };

    useEffect(() => {
        if (selectedStudent && activeTab === 'goals') {
            fetchGoals(selectedStudent.id);
        }
    }, [selectedStudent, activeTab]);

    const fetchStudents = async () => {
        // Fetch profiles joined with enrollments, cycles, and attendance
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                first_name,
                last_name,
                email,
                phone,
                role,
                is_deleted,
                enrollments (
                    id,
                    status,
                    payment_status,
                    cycle:cycles ( name, type ),
                    attendance ( id, status )
                )
            `)
            .eq('role', 'student')
            .eq('is_deleted', viewMode === 'trash');

        if (error) {
            console.error('Error fetching students:', error);
            return;
        }

        // Fetch form submissions to get detail data
        const emails = data.map((p: any) => p.email);
        const { data: submissions } = await supabase
            .from('form_submissions')
            .select('email, data')
            .in('email', emails);

        const submissionsMap = (submissions || []).reduce((acc: any, curr: any) => {
            acc[curr.email] = curr.data;
            return acc;
        }, {});

        const formatted: Student[] = data.map((p: any) => {
            const activeEnrollment = p.enrollments?.[0]; // Best guess: first enrollment
            const attendanceCount = activeEnrollment?.attendance?.filter((a: any) => a.status === 'present').length || 0;

            return {
                id: p.id,
                name: `${p.first_name} ${p.last_name}`,
                email: p.email,
                phone: p.phone || '-',
                currentPackage: activeEnrollment?.cycle?.name || 'Sin Asignar',
                packageType: activeEnrollment?.cycle?.type || 'initial',
                status: activeEnrollment?.status === 'active' ? 'ACTIVE' : (activeEnrollment?.status === 'conflict' ? 'CONFLICT' : 'GRADUATED'),
                attendanceCount: attendanceCount,
                formData: submissionsMap[p.email] || {},
                is_deleted: p.is_deleted
            };
        });
        setStudents(formatted);
        fetchTrashCount();
    };

    const AttendanceCircles = ({ type, count }: { type: string, count: number }) => {
        let total = 4;
        let blocks = 1;
        if (type === 'advanced') total = 5;
        if (type === 'plan_lider') {
            total = 9;
            blocks = 3;
        }

        const items = Array.from({ length: total });

        if (blocks === 1) {
            return (
                <div className="flex gap-1 justify-center">
                    {items.map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full border ${i < count ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-100 border-slate-200'}`}
                        />
                    ))}
                </div>
            );
        }

        // PL Grouping
        return (
            <div className="flex gap-2 justify-center">
                {[0, 1, 2].map(b => (
                    <div key={b} className="flex gap-1">
                        {[0, 1, 2].map(i => {
                            const idx = b * 3 + i;
                            return (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full border ${idx < count ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-100 border-slate-200'}`}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    const handleSoftDelete = async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('profiles')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: user?.id || null
            })
            .eq('id', id);

        if (error) {
            alert('Error al mover a la papelera');
        } else {
            fetchStudents();
            setSelectedStudent(null);
        }
    };

    const handleRestore = async (id: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            })
            .eq('id', id);

        if (error) {
            alert('Error al restaurar');
        } else {
            fetchStudents();
            setSelectedStudent(null);
        }
    };

    const handlePermanentDelete = async () => {
        if (!studentToDelete) return;

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
            .from('profiles')
            .delete()
            .eq('id', studentToDelete.id);

        if (error) {
            alert('Error al eliminar definitivamente');
        } else {
            setIsConfirmDeleteOpen(false);
            setStudentToDelete(null);
            fetchStudents();
        }
    };

    const fetchGoals = async (studentId: string) => {
        setIsLoadingGoals(true);
        // We need enrollment_id for goals. We'll query student_goals joined with enrollments filtered by user_id
        // Or simpler: fetch goals where enrollment.user_id = studentId
        // But goals table has enrollment_id.
        // Step 1: Get latest enrollment id for user
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', studentId)
            .limit(1);

        if (enrollments && enrollments.length > 0) {
            const enrollmentId = enrollments[0].id;
            const { data: goals } = await supabase
                .from('student_goals')
                .select('*')
                .eq('enrollment_id', enrollmentId);

            setStudentGoals(goals || []);
        } else {
            setStudentGoals([]);
        }
        setIsLoadingGoals(false);
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <>
            <div className="formal-card overflow-hidden animate-fade-in-up h-full flex flex-col">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-bold text-slate-800">
                            {viewMode === 'active' ? 'Gestión de Alumnos' : 'Papelera de Alumnos'}
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
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="formal-search-container">
                            <input
                                type="text"
                                placeholder="Buscar alumno..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="formal-search-input"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold uppercase text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                            <option value="ALL">TODOS</option>
                            <option value="ACTIVE">ACTIVOS</option>
                            <option value="CONFLICT">EN CONFLICTO</option>
                            <option value="GRADUADOS">GRADUADOS</option>
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
                                <th className="text-center">Progreso</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className={`hover:bg-slate-50 transition-colors ${student.status === 'CONFLICT' ? 'bg-rose-50/50' : ''}`}>
                                    <td className="cursor-pointer" onClick={() => setSelectedStudent(student)}>
                                        <div className="font-bold text-slate-800">{student.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tight">{student.email}</div>
                                    </td>
                                    <td>
                                        <span className="px-2 py-1 rounded-sm text-[10px] font-bold border bg-blue-50 border-blue-200 text-blue-700 uppercase tracking-wider">
                                            {student.currentPackage}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${student.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {student.status === 'ACTIVE' ? 'CURSANDO' : student.status}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <AttendanceCircles type={student.packageType} count={student.attendanceCount} />
                                    </td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => setSelectedStudent(student)}
                                            className="text-blue-600 font-bold text-[10px] uppercase border border-blue-100 px-3 py-1 rounded-sm hover:bg-blue-50 transition-colors"
                                        >
                                            Ver Perfil
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Student Detail Modal Portal */}
            {selectedStudent && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setSelectedStudent(null)}>
                    <div className="formal-modal w-full max-w-4xl overflow-hidden h-[85vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-slate-900 leading-tight">{selectedStudent.name}</h3>
                                <div className="flex gap-6 mt-6">
                                    <button
                                        onClick={() => setActiveTab('info')}
                                        className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Información general
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('goals')}
                                        className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all ${activeTab === 'goals' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Seguimiento de Metas
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 bg-white">
                            {activeTab === 'info' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-8">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Información del Formulario</h4>
                                            <div className="space-y-6">
                                                {/* Personal Section */}
                                                <div>
                                                    <h5 className="text-[10px] font-bold text-slate-800 uppercase mb-3 border-b border-slate-100 pb-1">Datos Personales</h5>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Nombre Completo</label>
                                                            <p className="text-xs text-slate-700">{selectedStudent.formData.full_name || selectedStudent.name}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Fecha Nacimiento</label>
                                                            <p className="text-xs text-slate-700">{selectedStudent.formData.birth_date || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">DNI / ID</label>
                                                            <p className="text-xs text-slate-700">{selectedStudent.formData.dni_id || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Ocupación</label>
                                                            <p className="text-xs text-slate-700">{selectedStudent.formData.occupation || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Medical Section */}
                                                <div>
                                                    <h5 className="text-[10px] font-bold text-slate-800 uppercase mb-3 border-b border-slate-100 pb-1">Datos Médicos</h5>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Condiciones / Alergias</label>
                                                            <p className="text-xs text-slate-700">{selectedStudent.formData.medical_conditions || 'Ninguna declarada'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Medicación Actual</label>
                                                            <p className="text-xs text-slate-700">{selectedStudent.formData.current_medication || 'Ninguna'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Contacto Emergencia</label>
                                                            <p className="text-xs text-slate-700">{selectedStudent.formData.emergency_contact || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Extra Section */}
                                                <div>
                                                    <h5 className="text-[10px] font-bold text-slate-800 uppercase mb-3 border-b border-slate-100 pb-1">Preguntas Extra</h5>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">¿Cómo nos conociste?</label>
                                                            <p className="text-xs text-slate-700">{selectedStudent.formData.how_met || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Motivación</label>
                                                            <p className="text-xs text-slate-700 line-clamp-3">{selectedStudent.formData.motivation || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Estado de Asistencia y Programa</h4>
                                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-sm">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-800 block">{selectedStudent.currentPackage}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{selectedStudent.packageType}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm uppercase tracking-tight">Activo</span>
                                                </div>

                                                <div className="mb-4">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-2">Progreso de Asistencia</label>
                                                    <AttendanceCircles type={selectedStudent.packageType} count={selectedStudent.attendanceCount} />
                                                    <p className="text-center text-[9px] font-bold text-slate-400 uppercase mt-2 tracking-tighter">
                                                        {selectedStudent.attendanceCount} días completados
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Resumen Académico</h4>
                                        <div className="p-6 border border-slate-100 rounded-sm bg-slate-50/50 italic text-sm text-slate-500 text-center mb-8">
                                            Historial de asistencias y notas próximamente integrado.
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {selectedStudent.is_deleted ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRestore(selectedStudent.id)}
                                                        className="w-full py-3 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                                                    >
                                                        Restaurar Alumno
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setStudentToDelete(selectedStudent);
                                                            setIsConfirmDeleteOpen(true);
                                                        }}
                                                        className="w-full py-3 text-red-500 hover:bg-red-50 font-bold text-[10px] uppercase tracking-widest rounded-sm transition-all border border-transparent hover:border-red-100"
                                                    >
                                                        Eliminar Definitivamente
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleSoftDelete(selectedStudent.id)}
                                                    className="w-full py-3 text-red-500 hover:bg-red-50 font-bold text-[10px] uppercase tracking-widest rounded-sm transition-all border border-transparent hover:border-red-100"
                                                >
                                                    Mover a la Papelera
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metas y Objetivos (Plan Líder)</h4>
                                        <button className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-sm hover:bg-slate-800 transition-colors">
                                            + Crear Nueva Meta
                                        </button>
                                    </div>

                                    {isLoadingGoals ? (
                                        <p className="text-center text-slate-400 py-10">Cargando metas...</p>
                                    ) : studentGoals.length === 0 ? (
                                        <div className="text-center py-20 bg-slate-50/50 rounded-sm border border-dashed border-slate-200 flex flex-col items-center">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm text-slate-300">
                                                <CheckIcon className="w-6 h-6" />
                                            </div>
                                            <p className="text-slate-500 font-bold text-sm">Sin metas registradas</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">El alumno no ha definido metas para su PL actual o no han sido cargadas.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {studentGoals.map(goal => (
                                                <div key={goal.id} className="border border-slate-100 rounded-sm p-5 bg-white shadow-sm flex gap-4 hover:border-blue-100 transition-colors">
                                                    <div className={`mt-1 w-8 h-8 rounded-sm flex items-center justify-center border transition-colors ${goal.status === 'achieved' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                                                        <CheckIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className={`font-bold text-slate-800 text-sm ${goal.status === 'achieved' ? 'line-through opacity-40' : ''}`}>
                                                                {goal.goal_description}
                                                            </h5>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{goal.target_date || 'Sin fecha'}</span>
                                                        </div>
                                                        {goal.staff_feedback && (
                                                            <div className="mt-4 bg-blue-50/50 p-3 border-l-2 border-blue-400 rounded-r-sm text-xs text-blue-800">
                                                                <span className="font-bold uppercase text-[9px] block mb-1 opacity-50">Feedback de Staff</span>
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
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Confirm Permanent Delete Modal */}
            {isConfirmDeleteOpen && studentToDelete && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setIsConfirmDeleteOpen(false)}>
                    <div className="formal-modal max-w-md w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                                <TrashIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar definitivamente?</h3>
                            <p className="text-sm text-slate-500 mb-8">
                                Estás a punto de borrar permanentemente a <strong>{studentToDelete.name}</strong>. Esta acción no se puede deshacer.
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

export default AdminStudents;
