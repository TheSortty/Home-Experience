import React, { useState, useEffect } from 'react';
import { MockDataService, Registration, CycleEvent } from '../../../services/mockDataService';
import { supabase } from '../../../services/supabaseClient';
import ArrowRightIcon from '../../../ui/icons/ArrowRightIcon';
import TrashIcon from '../../../ui/icons/TrashIcon';

const AdminAdmissions: React.FC = () => {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [cycles, setCycles] = useState<CycleEvent[]>([]);
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');

    useEffect(() => {
        const fetchRealData = async () => {
            // 1. Pedimos las inscripciones a Supabase
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error cargando admisiones:', error);
                return;
            }

            if (data) {
                // 2. Transformamos los datos de Supabase a tu formato visual
                const realRegistrations = data.map((item: any) => ({
                    id: item.id,
                    name: item.data.firstName + ' ' + item.data.lastName,
                    email: item.data.email,
                    date: new Date(item.created_at).toISOString().split('T')[0],
                    status: item.status || 'PENDING_REVIEW', // Usamos el estado real
                    selectedPackage: 'INICIAL', // Default por ahora
                    answers: [
                        { question: 'Ciudad', answer: item.data.city || '-' },
                        { question: 'Teléfono', answer: item.data.phone || '-' },
                        { question: 'Fecha de Nacimiento', answer: item.data.birthDate || '-' },
                        { question: 'Intención', answer: item.data.intention || '-' },
                        { question: 'Alergias', answer: item.data.allergies || '-' },
                        { question: 'Medicación', answer: item.data.medication || '-' },
                        { question: 'Bajo Tratamiento', answer: item.data.underTreatment || '-' },
                        { question: 'Detalles Tratamiento', answer: item.data.treatmentDetails || '-' },
                        { question: 'Contacto Emergencia', answer: item.data.emergencyName || '-' },
                        { question: 'Teléfono Emergencia', answer: item.data.emergencyPhone || '-' },
                        { question: 'Referido Por', answer: item.data.referredBy || '-' },
                    ]
                }));

                setRegistrations(realRegistrations);
            }
        };

        fetchRealData();
        // Cargamos los ciclos mockeados por ahora para que no rompa
        setCycles(MockDataService.getCycles().filter(c => c.status === 'UPCOMING'));
    }, []);

    const pendingReview = registrations.filter(r => r.status === 'PENDING_REVIEW');
    const pendingPayment = registrations.filter(r => r.status === 'PENDING_PAYMENT');
    const deletedRegistrations = registrations.filter(r => r.status === 'DELETED');

    const handleStatusUpdate = async (reg: Registration, newStatus: string) => {
        const { error } = await supabase
            .from('registrations')
            .update({ status: newStatus })
            .eq('id', reg.id);

        if (error) {
            console.error('Error updating status:', error);
            return;
        }

        const updated = { ...reg, status: newStatus as any };
        const newRegs = registrations.map(r => r.id === reg.id ? updated : r);
        setRegistrations(newRegs);
        MockDataService.saveRegistrations(newRegs);
        setSelectedRegistration(null);
    };

    const handleApprove = (reg: Registration) => handleStatusUpdate(reg, 'PENDING_PAYMENT');
    const handleDelete = (reg: Registration) => handleStatusUpdate(reg, 'DELETED');
    const handleRestore = (reg: Registration) => handleStatusUpdate(reg, 'PENDING_REVIEW');

    const handleConfirmPayment = (reg: Registration, cycleId: string) => {
        // 1. Create Student
        const cycle = cycles.find(c => c.id === cycleId);
        if (!cycle) return;

        // Add student via service (we'd need to export addStudent or just use get/save)
        const students = MockDataService.getStudents();
        const newStudent = {
            id: `student_${Date.now()}`,
            name: reg.name,
            email: reg.email,
            phone: '+54 9 ...', // Placeholder
            pl: Math.floor(Math.random() * 100),
            cycleId: cycle.id,
            currentPackage: cycle.level,
            purchasedPackage: reg.selectedPackage,
            status: 'ACTIVE' as const,
            progress: 0,
            attendance: [false, false, false, false],
            nextPackageLocked: true,
            notes: 'Ingresado desde Admisiones'
        };
        students.push(newStudent);
        MockDataService.saveStudents(students);

        // 2. Remove Registration
        const newRegs = registrations.filter(r => r.id !== reg.id);
        setRegistrations(newRegs);
        MockDataService.saveRegistrations(newRegs);

        // 3. Update Cycle Count
        cycle.enrolledCount++;
        MockDataService.saveCycles(MockDataService.getCycles().map(c => c.id === cycle.id ? cycle : c));

        setIsAssignModalOpen(false);
        setSelectedRegistration(null);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up h-[calc(100vh-200px)]">
            {/* Pending Review Column */}
            <div className="bg-white/80 border border-slate-200/60 rounded-2xl shadow-sm p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-slate-900">
                            {viewMode === 'active' ? 'Solicitudes Nuevas' : 'Papelera de Reciclaje'}
                        </h3>
                        {viewMode === 'active' && (
                            <button
                                onClick={() => setViewMode('trash')}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Ver Papelera"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        )}
                        {viewMode === 'trash' && (
                            <button
                                onClick={() => setViewMode('active')}
                                className="px-3 py-1 text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Volver a Activas
                            </button>
                        )}
                    </div>
                    <span className={`${viewMode === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'} text-xs font-bold px-2 py-1 rounded-full`}>
                        {viewMode === 'active' ? pendingReview.length : deletedRegistrations.length}
                    </span>
                </div>
                <div className="space-y-4 flex-1 overflow-y-auto">
                    {(viewMode === 'active' ? pendingReview : deletedRegistrations).length === 0 ? (
                        <p className="text-slate-400 text-center py-8 italic">
                            {viewMode === 'active' ? 'No hay solicitudes pendientes.' : 'No hay elementos en la papelera.'}
                        </p>
                    ) : (
                        (viewMode === 'active' ? pendingReview : deletedRegistrations).map(reg => (
                            <div key={reg.id} className={`bg-white border ${viewMode === 'active' ? 'border-slate-100' : 'border-red-100 bg-red-50/30'} p-4 rounded-xl hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer`} onClick={() => setSelectedRegistration(reg)}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-slate-800">{reg.name}</h4>
                                        <p className="text-xs text-slate-500 mb-2">{reg.date}</p>
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{reg.selectedPackage}</span>
                                    </div>
                                    <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRightIcon className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Pending Payment / Assignment Column */}
            <div className="bg-white/80 border border-slate-200/60 rounded-2xl shadow-sm p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Pagos y Asignación</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{pendingPayment.length}</span>
                </div>
                <div className="space-y-4 flex-1 overflow-y-auto">
                    {pendingPayment.length === 0 ? (
                        <p className="text-slate-400 text-center py-8 italic">No hay pagos pendientes.</p>
                    ) : (
                        pendingPayment.map(reg => (
                            <div key={reg.id} className="bg-white border border-slate-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <h4 className="font-bold text-slate-800">{reg.name}</h4>
                                    <span className="text-xs font-bold text-emerald-600">Aprobado</span>
                                    <p className="text-xs text-slate-400 mt-1">{reg.selectedPackage}</p>
                                </div>
                                <button
                                    onClick={() => { setSelectedRegistration(reg); setIsAssignModalOpen(true); }}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                                >
                                    Confirmar y Asignar
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedRegistration && !isAssignModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRegistration(null)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{selectedRegistration.name}</h3>
                                <p className="text-slate-500">{selectedRegistration.email}</p>
                            </div>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                {selectedRegistration.selectedPackage}
                            </span>
                        </div>
                        <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto">
                            {selectedRegistration.answers.map((qa, idx) => (
                                <div key={idx}>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">{qa.question}</p>
                                    <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{qa.answer}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setSelectedRegistration(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cerrar</button>

                            {selectedRegistration.status === 'DELETED' ? (
                                <button onClick={() => handleRestore(selectedRegistration)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors">
                                    Restaurar Solicitud
                                </button>
                            ) : (
                                <>
                                    {selectedRegistration.status === 'PENDING_REVIEW' && (
                                        <button onClick={() => handleDelete(selectedRegistration)} className="px-4 py-2 text-red-500 hover:bg-red-50 font-bold rounded-lg transition-colors border border-transparent hover:border-red-100">
                                            Eliminar
                                        </button>
                                    )}
                                    {selectedRegistration.status === 'PENDING_REVIEW' && (
                                        <button onClick={() => handleApprove(selectedRegistration)} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg">
                                            Aprobar Solicitud
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {isAssignModalOpen && selectedRegistration && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsAssignModalOpen(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Asignar a Ciclo</h3>
                        <p className="text-sm text-slate-500 mb-6">Selecciona el ciclo para inscribir a <strong>{selectedRegistration.name}</strong>.</p>

                        <div className="space-y-2 mb-6 max-h-[40vh] overflow-y-auto">
                            {cycles.map(cycle => (
                                <button
                                    key={cycle.id}
                                    onClick={() => handleConfirmPayment(selectedRegistration, cycle.id)}
                                    className="w-full p-3 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-800">{cycle.level}</span>
                                        <span className="text-xs bg-white border px-2 py-1 rounded">{cycle.startDate}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{cycle.enrolledCount} / {cycle.capacity} cupos ocupados</p>
                                </button>
                            ))}
                        </div>

                        <button onClick={() => setIsAssignModalOpen(false)} className="w-full py-3 text-slate-500 font-bold">Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAdmissions;
