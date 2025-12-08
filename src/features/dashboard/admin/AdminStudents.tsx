import React, { useState, useEffect } from 'react';
import { MockDataService, Student } from '../../../services/mockDataService';
import CheckIcon from '../../../ui/icons/CheckIcon';

const AdminStudents: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    useEffect(() => {
        // setStudents(MockDataService.getStudents());
        setStudents([]);
    }, []);

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
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${student.currentPackage === 'AVANZADO' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                                        student.currentPackage === 'PROGRAMA LIDER' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                            'bg-blue-50 border-blue-200 text-blue-700'
                                        }`}>
                                        {student.currentPackage}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {student.status === 'CONFLICT' ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">
                                            EN CONFLICTO
                                        </span>
                                    ) : student.status === 'GRADUATED' ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                                            GRADUADO
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600">
                                            CURSANDO
                                        </span>
                                    )}
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
                    <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">{selectedStudent.name}</h3>
                            <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-900">✕</button>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Información Personal</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-slate-500 block">Email</label>
                                        <p className="font-medium">{selectedStudent.email}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 block">Teléfono</label>
                                        <p className="font-medium">{selectedStudent.phone}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 block">Paquete Comprado</label>
                                        <p className="font-medium">{selectedStudent.purchasedPackage}</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Estado Académico</h4>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-slate-600">Asistencia</span>
                                        <span className="font-bold text-slate-900">{selectedStudent.progress}%</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {selectedStudent.attendance.map((present, idx) => (
                                            <div key={idx} className={`h-2 flex-1 rounded-full ${present ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-2">Notas</label>
                                    <textarea
                                        className="w-full p-3 border rounded-lg text-sm bg-slate-50"
                                        rows={4}
                                        defaultValue={selectedStudent.notes}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminStudents;
