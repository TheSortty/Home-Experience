import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../services/supabaseClient';
import CheckIcon from '../../../ui/icons/CheckIcon';

interface Student {
    id: string;
    name: string;
    email: string;
    phone: string;
    currentPackage: string;
    status: 'ACTIVE' | 'CONFLICT' | 'GRADUATED';
    progress: number;
    pl: number;
    notes: string;
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

    // Goals State
    const [studentGoals, setStudentGoals] = useState<Goal[]>([]);
    const [isLoadingGoals, setIsLoadingGoals] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        if (selectedStudent && activeTab === 'goals') {
            fetchGoals(selectedStudent.id);
        }
    }, [selectedStudent, activeTab]);

    const fetchStudents = async () => {
        // Fetch profiles joined with enrollments
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                first_name,
                last_name,
                email,
                phone,
                role,
                enrollments (
                    status,
                    payment_status,
                    cycle:cycles ( name, type )
                )
            `)
            .eq('role', 'student');

        if (error) {
            console.error('Error fetching students:', error);
            return;
        }

        const formatted: Student[] = data.map((p: any) => {
            // Determine active enrollment/package
            const activeEnrollment = p.enrollments?.[0]; // Simplified: grab first

            return {
                id: p.id,
                name: `${p.first_name} ${p.last_name}`,
                email: p.email,
                phone: p.phone || '-',
                currentPackage: activeEnrollment?.cycle?.name || 'Sin Asignar',
                status: activeEnrollment?.status === 'active' ? 'ACTIVE' : 'GRADUATED', // Simplified logic
                progress: 0, // Placeholder
                pl: 0, // Placeholder
                notes: ''
            };
        });
        setStudents(formatted);
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
                    <h3 className="text-lg font-bold text-slate-800">Gestión de Alumnos</h3>
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
                                        <div className="w-24 bg-slate-100 rounded-full h-1.5 mx-auto overflow-hidden">
                                            <div className="bg-blue-600 h-1.5" style={{ width: `${student.progress}%` }}></div>
                                        </div>
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
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Detalles de contacto</h4>
                                            <div className="grid grid-cols-1 gap-6">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Correo Electrónico</label>
                                                    <p className="text-sm font-medium text-slate-900">{selectedStudent.email}</p>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Teléfono</label>
                                                    <p className="text-sm font-medium text-slate-900">{selectedStudent.phone}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Programa actual</h4>
                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-sm">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-slate-600">{selectedStudent.currentPackage}</span>
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase">En curso</span>
                                                </div>
                                                <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                                    <div className="bg-blue-600 h-full" style={{ width: '45%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Resumen Académico</h4>
                                        <div className="p-6 border border-slate-100 rounded-sm bg-slate-50/50 italic text-sm text-slate-500 text-center">
                                            Historial de asistencias y notas próximamente integrado.
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
        </>
    );
};

export default AdminStudents;
