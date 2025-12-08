import React, { useState, useEffect } from 'react';
import { MockDataService, CycleEvent, Student, PackageLevel } from '../../../services/mockDataService';
import UsersIcon from '../../../ui/icons/UsersIcon';
import CalendarIcon from '../../../ui/icons/CalendarIcon';
import CheckIcon from '../../../ui/icons/CheckIcon';

const AdminCalendar: React.FC = () => {
    const [cycles, setCycles] = useState<CycleEvent[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState<CycleEvent | null>(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null); // 0-3 for the 4 days

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        // setCycles(MockDataService.getCycles());
        // setStudents(MockDataService.getStudents());
        setCycles([]);
        setStudents([]);
    };

    const handleCreateCycle = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        // Simple ID generation
        const newCycle: CycleEvent = {
            id: `cycle_${Date.now()}`,
            startDate: formData.get('startDate') as string,
            endDate: formData.get('endDate') as string,
            month: 'Nuevo', // Should calculate from date
            year: new Date(formData.get('startDate') as string).getFullYear(),
            level: formData.get('level') as PackageLevel,
            enrolledCount: 0,
            capacity: formData.get('level') === 'INICIAL' ? 30 : 20,
            status: 'UPCOMING'
        };

        MockDataService.addCycle(newCycle);
        loadData();
        setIsCreateModalOpen(false);
    };

    const handleAttendanceToggle = (studentId: string, dayIndex: number) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const newAttendance = [...student.attendance];
        newAttendance[dayIndex] = !newAttendance[dayIndex];

        // Update student
        const updatedStudent = { ...student, attendance: newAttendance };
        MockDataService.updateStudent(updatedStudent);

        // Refresh local state
        setStudents(prev => prev.map(s => s.id === studentId ? updatedStudent : s));
    };

    const filteredCycles = cycles.filter(c =>
        c.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.level.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get students for selected cycle
    const cycleStudents = selectedCycle ? students.filter(s => s.cycleId === selectedCycle.id) : [];

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-200px)] animate-fade-in-up">
            {/* Left: Cycle List */}
            <div className="flex-1 bg-white/80 border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900">Programación</h3>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        + Nuevo Ciclo
                    </button>
                </div>

                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <input
                        type="text"
                        placeholder="Buscar por mes o nivel..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>

                <div className="overflow-y-auto p-6 space-y-4">
                    {filteredCycles.map(cycle => (
                        <div key={cycle.id} className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shadow-sm ${cycle.level === 'INICIAL' ? 'bg-blue-500' : cycle.level === 'AVANZADO' ? 'bg-purple-500' : 'bg-indigo-600'
                                        }`}>
                                        <span className="text-lg">{cycle.startDate.split('-')[2]}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{cycle.level}</h4>
                                        <p className="text-xs text-slate-500">{cycle.startDate} - {cycle.endDate}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${cycle.status === 'COMPLETED' ? 'bg-slate-100 text-slate-500' :
                                    cycle.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-600' :
                                        'bg-blue-50 text-blue-600'
                                    }`}>
                                    {cycle.status === 'IN_PROGRESS' ? 'En curso' : cycle.status === 'COMPLETED' ? 'Finalizado' : 'Próximo'}
                                </span>
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {['Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setSelectedCycle(cycle);
                                            setSelectedDayIndex(idx);
                                        }}
                                        className="text-xs py-2 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded text-center transition-colors"
                                    >
                                        <span className="block font-bold text-slate-700">{day}</span>
                                        <span className="text-[10px] text-slate-400">Gestionar</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-50 pt-3">
                                <div className="flex items-center">
                                    <UsersIcon className="w-4 h-4 mr-1" />
                                    {cycleStudents.length} / {cycle.capacity} Inscritos
                                </div>
                                <button className="text-blue-600 font-bold hover:underline">Ver Detalles</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">Crear Nuevo Ciclo</h3>
                        <form onSubmit={handleCreateCycle} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nivel</label>
                                <select name="level" className="w-full p-2 border rounded-lg">
                                    <option value="INICIAL">INICIAL</option>
                                    <option value="AVANZADO">AVANZADO</option>
                                    <option value="PROGRAMA LIDER">PROGRAMA LIDER</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Inicio</label>
                                    <input type="date" name="startDate" required className="w-full p-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Fin</label>
                                    <input type="date" name="endDate" required className="w-full p-2 border rounded-lg" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-500">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold">Crear Ciclo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Attendance Modal */}
            {selectedCycle && selectedDayIndex !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedCycle(null); setSelectedDayIndex(null); }}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Gestión de Asistencia</h3>
                                <p className="text-slate-500">
                                    {selectedCycle.level} • Día {selectedDayIndex + 1} ({['Jueves', 'Viernes', 'Sábado', 'Domingo'][selectedDayIndex]})
                                </p>
                            </div>
                            <button onClick={() => { setSelectedCycle(null); setSelectedDayIndex(null); }} className="text-slate-400 hover:text-slate-900">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {cycleStudents.length === 0 ? (
                                <p className="text-center text-slate-400 py-10">No hay alumnos inscritos en este ciclo.</p>
                            ) : (
                                <div className="space-y-2">
                                    {cycleStudents.map(student => (
                                        <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{student.name}</p>
                                                    <p className="text-xs text-slate-500">{student.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAttendanceToggle(student.id, selectedDayIndex)}
                                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${student.attendance[selectedDayIndex]
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                                    }`}
                                            >
                                                {student.attendance[selectedDayIndex] ? (
                                                    <>
                                                        <CheckIcon className="w-4 h-4" /> Presente
                                                    </>
                                                ) : 'Ausente'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCalendar;
