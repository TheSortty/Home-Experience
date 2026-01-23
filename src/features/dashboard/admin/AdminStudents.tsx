import React, { useState, useEffect } from 'react';
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
                role,
                enrollments (
                    status,
                    is_fully_paid,
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
                phone: '-', // Need to fetch from user_profiles or main table if added
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
        <div className="bg-white/80 border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up h-[calc(100vh-200px)] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4">
                <h3 className="text-xl font-bold text-slate-900">Gestión de Alumnos</h3>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Buscar alumno..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="ACTIVE">Activos</option>
                        <option value="CONFLICT">En Conflicto</option>
                        <option value="GRADUATED">Graduados</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400 border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4">Alumno</th>
                            <th className="px-6 py-4">Etapa Actual</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4 text-center">Progreso</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredStudents.map((student) => (
                            <tr key={student.id} className={`transition-colors ${student.status === 'CONFLICT' ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}>
                                <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                                    <div className="font-bold text-slate-800">{student.name}</div>
                                    <div className="text-xs text-slate-400">PL {student.pl} • {student.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold border bg-blue-50 border-blue-200 text-blue-700">
                                        {student.currentPackage}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${student.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {student.status === 'ACTIVE' ? 'CURSANDO' : student.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 max-w-[100px] mx-auto">
                                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${student.progress}%` }}></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => setSelectedStudent(student)}
                                        className="text-blue-600 font-bold text-xs hover:underline"
                                    >
                                        Ver Perfil
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Student Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStudent(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{selectedStudent.name}</h3>
                                <div className="flex gap-4 mt-2">
                                    <button
                                        onClick={() => setActiveTab('info')}
                                        className={`text-sm font-bold pb-1 border-b-2 ${activeTab === 'info' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Información
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('goals')}
                                        className={`text-sm font-bold pb-1 border-b-2 ${activeTab === 'goals' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Seguimiento de Metas
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-900">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            {activeTab === 'info' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Información Personal</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-slate-500 block">Email</label>
                                                <p className="font-medium">{selectedStudent.email}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 block">Paquete Actual</label>
                                                <p className="font-medium">{selectedStudent.currentPackage}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Placeholder for stats */}
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Estado Académico</h4>
                                        <p className="text-sm text-slate-500">Funcionalidad completa de asistencia próximamente.</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Metas y Objetivos (Plan Líder)</h4>
                                        <button className="text-xs bg-slate-900 text-white px-3 py-1 rounded-lg font-bold">
                                            + Nueva Meta
                                        </button>
                                    </div>

                                    {isLoadingGoals ? (
                                        <p className="text-center text-slate-400">Cargando metas...</p>
                                    ) : studentGoals.length === 0 ? (
                                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-slate-400 font-medium">Este alumno aún no tiene metas definidas.</p>
                                            <p className="text-xs text-slate-300 mt-1">Las metas aparecerán aquí una vez creadas.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {studentGoals.map(goal => (
                                                <div key={goal.id} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm flex gap-4">
                                                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center border ${goal.status === 'achieved' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                                        <CheckIcon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h5 className={`font-bold text-slate-800 ${goal.status === 'achieved' ? 'line-through opacity-50' : ''}`}>
                                                            {goal.goal_description}
                                                        </h5>
                                                        <p className="text-xs text-slate-400 mt-1">Fecha Límite: {goal.target_date || 'Sin fecha'}</p>
                                                        {goal.staff_feedback && (
                                                            <div className="mt-2 bg-blue-50 p-2 rounded text-xs text-blue-800">
                                                                <strong>Feedback Staff:</strong> {goal.staff_feedback}
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
                </div>
            )}
        </div>
    );
};

export default AdminStudents;
