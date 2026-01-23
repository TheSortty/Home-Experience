import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import ArrowRightIcon from '../../../ui/icons/ArrowRightIcon';
import TrashIcon from '../../../ui/icons/TrashIcon';

// Types (simplified for this file)
interface Registration {
    id: string;
    name: string;
    email: string;
    date: string;
    status: 'PENDING_REVIEW' | 'PENDING_PAYMENT' | 'APPROVED' | 'DELETED';
    selectedPackage: string; // "INICIAL", "AVANZADO", "COMBO", etc.
    answers: { question: string; answer: string }[];
}

interface Cycle {
    id: string;
    name: string;
    start_date: string;
    type: string;
    capacity: number;
    enrolled_count: number;
}

const AdminAdmissions: React.FC = () => {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');

    // Confirm Modal State
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('MERCADO_PAGO'); // 'MERCADO_PAGO', 'TRANSFER', 'CASH'
    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [selectedCycleId2, setSelectedCycleId2] = useState(''); // For Combos
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchRegistrations();
        fetchCycles();
    }, []);

    const fetchRegistrations = async () => {
        const { data, error } = await supabase
            .from('form_submissions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching registrations:', error);
            return;
        }

        if (data) {
            const realRegistrations = data.map((item: any) => ({
                id: item.id,
                name: (item.data.firstName || '') + ' ' + (item.data.lastName || ''),
                email: item.data.email,
                date: new Date(item.created_at).toISOString().split('T')[0],
                status: item.status === 'pending' ? 'PENDING_REVIEW' :
                    (item.status === 'approved' ? 'PENDING_PAYMENT' :
                        (item.status === 'enrolled' ? 'APPROVED' : item.status)),
                selectedPackage: (item.data.intention?.includes('COMBO') ? 'COMBO' : 'INICIAL').toUpperCase(), // Simple logic for now, ideally mapped from form
                answers: Object.entries(item.data).map(([key, val]) => ({ question: key, answer: String(val) }))
            }));
            setRegistrations(realRegistrations);
        }
    };

    const fetchCycles = async () => {
        const { data, error } = await supabase
            .from('cycles')
            .select('*')
            .eq('status', 'active')
            .order('start_date', { ascending: true });

        if (!error && data) {
            setCycles(data);
        }
    };

    const handleStatusUpdate = async (reg: Registration, newStatus: string) => {
        // Map UI status back to DB status
        let dbStatus = 'pending';
        if (newStatus === 'PENDING_REVIEW') dbStatus = 'pending';
        if (newStatus === 'PENDING_PAYMENT') dbStatus = 'approved';
        if (newStatus === 'APPROVED') dbStatus = 'enrolled';
        if (newStatus === 'DELETED') dbStatus = 'rejected';

        const { error } = await supabase
            .from('form_submissions')
            .update({ status: dbStatus })
            .eq('id', reg.id);

        if (error) {
            alert('Error updating status');
        } else {
            fetchRegistrations();
            setSelectedRegistration(null);
        }
    };

    const handleConfirmEnrollment = async () => {
        if (!selectedRegistration || !paymentConfirmed || !selectedCycleId) return;

        setIsSubmitting(true);
        try {
            // Call RPC function V2
            const { data, error } = await supabase.rpc('confirm_submission_enrollment', {
                p_submission_id: selectedRegistration.id,
                p_cycle_id: selectedCycleId,
                p_payment_method: paymentMethod,
                p_is_total_payment: true // Simplified for now
            });

            if (error) throw error;

            if (data.success) {
                // Handle Combo (Second Cycle) if needed
                if (isCombo(selectedRegistration.selectedPackage) && selectedCycleId2) {
                    const { error: error2 } = await supabase.from('enrollments').insert({
                        user_id: data.user_id,
                        cycle_id: selectedCycleId2,
                        status: 'active',
                        payment_method: paymentMethod,
                        is_fully_paid: true
                    });
                    if (error2) console.error('Error second enrollment', error2);
                }

                alert('✅ Alumno confirmado exitosamente!');

                // Enviar Email de Bienvenida
                const selectedCycle = cycles.find(c => c.id === selectedCycleId);
                if (selectedCycle) {
                    supabase.functions.invoke('send-email', {
                        body: {
                            type: 'COURSE_WELCOME',
                            data: {
                                email: selectedRegistration.email,
                                firstName: selectedRegistration.name.split(' ')[0],
                                cycleName: selectedCycle.name,
                                startDate: selectedCycle.start_date
                            }
                        }
                    }).then(({ error }) => {
                        if (error) console.error('Error enviando email:', error);
                    });
                }

                setIsAssignModalOpen(false);
                setSelectedRegistration(null);
                fetchRegistrations();
            } else {
                alert('Error en confirmación: ' + (data.error || 'Unknown'));
            }
        } catch (err: any) {
            console.error(err);
            alert('Error crítico: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isCombo = (pkg: string) => pkg.includes('COMBO') || pkg.includes('+');

    const pendingReview = registrations.filter(r => r.status === 'PENDING_REVIEW');
    const pendingPayment = registrations.filter(r => r.status === 'PENDING_PAYMENT');
    const deletedRegistrations = registrations.filter(r => r.status === 'DELETED');

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
                                    <span className="text-xs font-bold text-emerald-600">Aprobado (Esperando Pago)</span>
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
                                    <p className="text-slate-700 bg-slate-50 p-3 rounded-lg overflow-auto">{qa.answer}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setSelectedRegistration(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cerrar</button>

                            {selectedRegistration.status === 'DELETED' ? (
                                <button onClick={() => handleStatusUpdate(selectedRegistration, 'PENDING_REVIEW')} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors">
                                    Restaurar Solicitud
                                </button>
                            ) : (
                                <>
                                    {selectedRegistration.status === 'PENDING_REVIEW' && (
                                        <button onClick={() => handleStatusUpdate(selectedRegistration, 'DELETED')} className="px-4 py-2 text-red-500 hover:bg-red-50 font-bold rounded-lg transition-colors border border-transparent hover:border-red-100">
                                            Eliminar
                                        </button>
                                    )}
                                    {selectedRegistration.status === 'PENDING_REVIEW' && (
                                        <button onClick={() => handleStatusUpdate(selectedRegistration, 'PENDING_PAYMENT')} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg">
                                            Aprobar Solicitud
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment & Confirmation Modal ("The Brain") */}
            {isAssignModalOpen && selectedRegistration && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsAssignModalOpen(false)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Alumno</h3>
                        <p className="text-sm text-slate-500 mb-6">Verifica el pago y asigna las fechas de cursada para <strong>{selectedRegistration.name}</strong>.</p>

                        <div className="space-y-6">
                            {/* 1. Payment Verification */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="font-bold text-sm text-slate-700 mb-3 uppercase tracking-wider">1. Verificación de Pago</h4>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={paymentConfirmed}
                                            onChange={e => setPaymentConfirmed(e.target.checked)}
                                            className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500"
                                        />
                                        <span className="font-medium text-slate-700">Confirmar recepción del pago</span>
                                    </label>

                                    {paymentConfirmed && (
                                        <div className="animate-fade-in">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Método de Pago</label>
                                            <select
                                                value={paymentMethod}
                                                onChange={e => setPaymentMethod(e.target.value)}
                                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                            >
                                                <option value="MERCADO_PAGO">Mercado Pago (Tarjeta/Link)</option>
                                                <option value="TRANSFER">Transferencia Bancaria</option>
                                                <option value="CASH">Efectivo</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Cycle Assignment */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="font-bold text-sm text-slate-700 mb-3 uppercase tracking-wider">2. Asignación de Fechas</h4>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">
                                            {isCombo(selectedRegistration.selectedPackage) ? 'Ciclo Inicial (1º Parte)' : 'Seleccionar Ciclo'}
                                        </label>
                                        <select
                                            value={selectedCycleId}
                                            onChange={e => setSelectedCycleId(e.target.value)}
                                            className="w-full p-2 border rounded-lg text-sm bg-white"
                                        >
                                            <option value="">-- Seleccionar Fecha --</option>
                                            {cycles.filter(c => !isCombo(selectedRegistration.selectedPackage) || c.type === 'initial').map(cycle => (
                                                <option key={cycle.id} value={cycle.id}>
                                                    {cycle.name} ({cycle.start_date}) - {cycle.enrolled_count}/{cycle.capacity}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Combo Logic */}
                                    {isCombo(selectedRegistration.selectedPackage) && (
                                        <div className="animate-fade-in">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Ciclo Avanzado (2º Parte)</label>
                                            <select
                                                value={selectedCycleId2}
                                                onChange={e => setSelectedCycleId2(e.target.value)}
                                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                            >
                                                <option value="">-- A definir / Pendiente --</option>
                                                {cycles.filter(c => c.type === 'advanced').map(cycle => (
                                                    <option key={cycle.id} value={cycle.id}>
                                                        {cycle.name} ({cycle.start_date})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmEnrollment}
                                disabled={!paymentConfirmed || !selectedCycleId || isSubmitting}
                                className={`flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-blue-900/10 transition-all ${(!paymentConfirmed || !selectedCycleId) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] hover:bg-slate-800'}`}
                            >
                                {isSubmitting ? 'Procesando...' : 'CONFIRMAR ALUMNO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAdmissions;
