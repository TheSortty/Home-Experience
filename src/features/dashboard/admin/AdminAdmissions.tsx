import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabaseClient';
import ArrowRightIcon from '../../../ui/icons/ArrowRightIcon';
import TrashIcon from '../../../ui/icons/TrashIcon';
import DocumentIcon from '../../../ui/icons/DocumentIcon';
import ChartIcon from '../../../ui/icons/ChartIcon';

// Types (simplified for this file)
interface Registration {
    id: string;
    name: string;
    email: string;
    date: string;
    status: 'PENDING_REVIEW' | 'PENDING_PAYMENT' | 'APPROVED' | 'REJECTED' | 'DELETED';
    selectedPackage: string; // "INICIAL", "AVANZADO", "COMBO", etc.
    answers: { question: string; answer: string }[];
    is_deleted?: boolean;
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
    const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [selectedCycleId2, setSelectedCycleId2] = useState(''); // For Combos
    const [detailTab, setDetailTab] = useState('PERSONAL');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [trashCount, setTrashCount] = useState(0);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null);

    useEffect(() => {
        fetchRegistrations();
        fetchCycles();
        fetchTrashCount();
    }, [viewMode]);

    const fetchTrashCount = async () => {
        const { count, error } = await supabase
            .from('form_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('is_deleted', true);

        if (!error && count !== null) {
            setTrashCount(count);
        }
    };

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
                        (item.status === 'enrolled' ? 'APPROVED' :
                            (item.status === 'rejected' ? 'REJECTED' : item.status))),
                selectedPackage: (item.data.intention?.includes('COMBO') ? 'COMBO' : 'INICIAL').toUpperCase(), // Simple logic for now, ideally mapped from form
                answers: Object.entries(item.data).map(([key, val]) => ({ question: key, answer: String(val) })),
                is_deleted: item.is_deleted
            }));
            setRegistrations(realRegistrations);
            setTrashCount(realRegistrations.filter((r: Registration) => r.is_deleted).length);
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
        setIsSubmitting(true);
        // Map UI status back to DB status
        let dbStatus = 'pending';
        if (newStatus === 'PENDING_REVIEW') dbStatus = 'pending';
        if (newStatus === 'PENDING_PAYMENT') dbStatus = 'approved';
        if (newStatus === 'APPROVED') dbStatus = 'enrolled';
        if (newStatus === 'REJECTED') dbStatus = 'rejected';

        const { error } = await supabase
            .from('form_submissions')
            .update({ status: dbStatus })
            .eq('id', reg.id);

        if (error) {
            toast.error('Error updating status');
        } else {
            await fetchRegistrations();
            setSelectedRegistration(null);
        }
        setIsSubmitting(false);
    };

    const handleSoftDelete = async (reg: Registration) => {
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('form_submissions')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: user?.id || null
            })
            .eq('id', reg.id);

        if (error) {
            toast.error('Error al mover a la papelera');
        } else {
            if (user) {
                await supabase.from('activity_logs').insert({
                    user_id: user.id,
                    action: 'ENVIADO_A_PAPELERA',
                    details: {
                        description: `Envió a la papelera la solicitud de ${reg.name}.`,
                        adminEmail: user.email
                    }
                });
            }
            await fetchRegistrations();
            setSelectedRegistration(null);
        }
        setIsSubmitting(false);
    };

    const handleRestore = async (id: string) => {
        const { error } = await supabase
            .from('form_submissions')
            .update({
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            })
            .eq('id', id);

        if (error) {
            toast.error('Error al restaurar');
        } else {
            fetchRegistrations();
            setSelectedRegistration(null);
        }
    };

    const handlePermanentDelete = async () => {
        if (!registrationToDelete) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (profile?.role !== 'admin' && profile?.role !== 'sysadmin') {
            toast.error('No tienes permisos suficientes para eliminar permanentemente.');
            return;
        }

        const { error } = await supabase
            .from('form_submissions')
            .delete()
            .eq('id', registrationToDelete.id);

        if (error) {
            toast.error('Error al eliminar definitivamente');
        } else {
            if (user) {
                await supabase.from('activity_logs').insert({
                    user_id: user.id,
                    action: 'ELIMINACION_DEFINITIVA',
                    details: {
                        description: `Eliminó permanentemente la solicitud de ${registrationToDelete.name}.`,
                        adminEmail: user.email
                    }
                });
            }
            setIsConfirmDeleteOpen(false);
            setRegistrationToDelete(null);
            setSelectedRegistration(null); // Close the detail modal
            fetchRegistrations();
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
                // 1. Record the Payment
                const { error: paymentError } = await supabase.from('payments').insert({
                    submission_id: selectedRegistration.id,
                    enrollment_id: data.enrollment_id,
                    amount: paymentAmount || 0,
                    method: paymentMethod.toLowerCase(),
                    status: 'paid',
                    paid_at: new Date().toISOString()
                });
                if (paymentError) console.error('Error recording payment', paymentError);

                // 2. Handle Combo (Second Cycle) if needed
                if (isCombo(selectedRegistration.selectedPackage) && selectedCycleId2) {
                    const { error: error2 } = await supabase.from('enrollments').insert({
                        user_id: data.user_id,
                        cycle_id: selectedCycleId2,
                        status: 'active',
                        payment_status: 'paid'
                    });
                    if (error2) console.error('Error second enrollment', error2);
                }

                toast.success('✅ Alumno confirmado exitosamente!');

                const selectedCycle = cycles.find(c => c.id === selectedCycleId);

                // 3. Registrar en Activity Logs
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('activity_logs').insert({
                        user_id: user.id,
                        action: 'ALUMNO_APROBADO',
                        details: {
                            description: `Aprobó el ingreso de ${selectedRegistration.name} al ciclo ${selectedCycle?.name || 'Desconocido'}.`,
                            adminEmail: user.email,
                            studentEmail: selectedRegistration.email,
                            paymentMethod: paymentMethod,
                            package: selectedRegistration.selectedPackage
                        }
                    });
                }

                // Enviar Email de Bienvenida
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
                toast.error('Error en confirmación: ' + (data.error || 'Unknown'));
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Error crítico: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isCombo = (pkg: string) => pkg.includes('COMBO') || pkg.includes('+');

    const activeRegistrations = registrations.filter(r => !r.is_deleted);
    const trashRegistrations = registrations.filter(r => r.is_deleted);

    const pendingReview = activeRegistrations.filter(r => r.status === 'PENDING_REVIEW');
    const pendingPayment = activeRegistrations.filter(r => r.status === 'PENDING_PAYMENT');

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up h-full">
                {/* Pending Review Column */}
                <div className="formal-card p-8 flex flex-col h-full bg-white">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold text-slate-800">
                                {viewMode === 'active' ? 'Solicitudes Nuevas' : 'Papelera de Reciclaje'}
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
                                    Volver a Activas
                                </button>
                            )}
                        </div>
                        <span className={`${viewMode === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'} text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider`}>
                            {viewMode === 'active' ? pendingReview.length : trashRegistrations.length}
                        </span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                        {(viewMode === 'active' ? pendingReview : trashRegistrations).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                <DocumentIcon className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-sm font-medium">
                                    {viewMode === 'active' ? 'No hay solicitudes pendientes.' : 'No hay elementos en la papelera.'}
                                </p>
                            </div>
                        ) : (
                            (viewMode === 'active' ? pendingReview : trashRegistrations).map(reg => (
                                <div
                                    key={reg.id}
                                    className={`group p-4 bg-white border ${viewMode === 'active' ? 'border-slate-100' : 'border-red-50 bg-red-50/20'} rounded-sm hover:border-blue-200 cursor-pointer transition-all`}
                                    onClick={() => setSelectedRegistration(reg)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{reg.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-slate-400 border border-slate-100 px-1.5 py-0.5 uppercase">{reg.selectedPackage}</span>
                                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {reg.status === 'PENDING_REVIEW' ? 'Auditar Respuesta' : 'Ver detalle'} &rarr;
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{reg.date}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pending Payment / Assignment Column */}
                <div className="formal-card p-8 flex flex-col h-full bg-white">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-slate-800">Pagos y Asignación</h3>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">{pendingPayment.length}</span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                        {pendingPayment.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                <ChartIcon className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-sm font-medium">No hay pagos pendientes por procesar.</p>
                            </div>
                        ) : (
                            pendingPayment.map(reg => (
                                <div key={reg.id} className="p-4 bg-slate-50 border border-slate-100 rounded-sm flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-emerald-200 transition-all">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{reg.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Esperando Pago</span>
                                            <span className="text-slate-300 text-xs">|</span>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{reg.selectedPackage}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedRegistration(reg); setIsAssignModalOpen(true); }}
                                        className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all shadow-sm"
                                    >
                                        Confirmar Alumno
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Detail Modal Portal */}
            {selectedRegistration && !isAssignModalOpen && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setSelectedRegistration(null)}>
                    <div className="formal-modal max-w-5xl w-full p-0 flex flex-col h-[85vh] animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 bg-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
                            <div className="relative z-10">
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{selectedRegistration.name}</h3>
                                <div className="flex items-center gap-4 mt-3">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em]">{selectedRegistration.email}</p>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID: {selectedRegistration.id.substring(0, 8)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Programa Seleccionado</p>
                                    <span className="px-4 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-sm uppercase tracking-[0.1em]">
                                        {selectedRegistration.selectedPackage}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedRegistration(null)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-all border border-slate-100"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Body with Sidebar */}
                        <div className="flex flex-1 overflow-hidden bg-slate-50/30">
                            {/* Left Tabs Sidebar */}
                            <div className="w-64 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-between">
                                <div className="space-y-1.5">
                                    {[
                                        {
                                            id: 'PERSONAL',
                                            label: 'Perfil & Contacto',
                                            icon: (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            )
                                        },
                                        {
                                            id: 'MOTIVACIÓN',
                                            label: 'Propósito & Sueños',
                                            icon: (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                            )
                                        },
                                        {
                                            id: 'SALUD',
                                            label: 'Ficha Médica',
                                            icon: (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            )
                                        },
                                        {
                                            id: 'OTROS',
                                            label: 'Información Extra',
                                            icon: (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                                </svg>
                                            )
                                        }
                                    ].map(section => (
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

                                <div className="p-4 bg-white border border-slate-100 rounded-sm">
                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-2">Estado de Revisión</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${selectedRegistration.status === 'PENDING_REVIEW' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                                        <span className="text-[10px] font-bold text-slate-600 uppercase">{selectedRegistration.status === 'PENDING_REVIEW' ? 'Pendiente' : 'Aprobado'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Content Area */}
                            <div className="flex-1 overflow-y-auto p-12 bg-white">
                                <div className="max-w-4xl mx-auto">
                                    <div className="mb-12">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-3">
                                            {detailTab === 'PERSONAL' && 'Sección 01'}
                                            {detailTab === 'MOTIVACIÓN' && 'Sección 02'}
                                            {detailTab === 'SALUD' && 'Sección 03'}
                                            {detailTab === 'OTROS' && 'Sección 04'}
                                        </h4>
                                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                            {detailTab === 'PERSONAL' && 'Información de Contacto y Perfil'}
                                            {detailTab === 'MOTIVACIÓN' && 'Propósito, Sueños y Metas'}
                                            {detailTab === 'SALUD' && 'Historial Médico y Emergencias'}
                                            {detailTab === 'OTROS' && 'Información Adicional Recopilada'}
                                        </h2>
                                        <div className="h-1 w-12 bg-blue-600 mt-6 rounded-full"></div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                        {(() => {
                                            const dictionaries: Record<string, Record<string, string>> = {
                                                'PERSONAL': {
                                                    'firstName': 'Nombre', 'lastName': 'Apellido', 'email': 'Correo Electrónico',
                                                    'phone': 'Teléfono', 'age': 'Edad', 'dni': 'DNI', 'city': 'Ciudad',
                                                    'address': 'Dirección', 'occupation': 'Ocupación', 'birthDate': 'Fecha de Nac.',
                                                    'gender': 'Género', 'instagram': 'Instagram'
                                                },
                                                'MOTIVACIÓN': {
                                                    'dream1': 'Sueño Principal', 'dream2': 'Segundo Sueño', 'dream3': 'Tercer Sueño',
                                                    'dreams': 'Sueños y Aspiraciones', 'expectations': 'Expectativas del programa',
                                                    'whyNow': '¿Por qué ahora?', 'referral': '¿Cómo nos conociste?',
                                                    'referralChannel': 'Canal de llegada', 'referredBy': 'Recomendado por',
                                                    'goals': 'Metas', 'qualities': 'Cualidades', 'context': 'Contexto actual'
                                                },
                                                'SALUD': {
                                                    'healthIssue': 'Problemas de salud', 'medication': 'Medicación actual',
                                                    'allergies': 'Alergias', 'emergencyContact': 'Contacto de Emerg.',
                                                    'medicalNotes': 'Notas Médicas', 'specialConditions': 'Condiciones Especiales',
                                                    'pregnant': '¿Embarazo?', 'medicalInfo': 'Información Médica', 'bloodType': 'Grupo Sanguíneo'
                                                }
                                            };

                                            const dict = dictionaries[detailTab];
                                            let itemsToRender: { label: string, val: string }[] = [];

                                            if (dict) {
                                                itemsToRender = Object.entries(dict).map(([key, label]) => {
                                                    const found = selectedRegistration.answers.find(a => a.question === key);
                                                    return { label, val: found?.answer || '' };
                                                });
                                            } else if (detailTab === 'OTROS') {
                                                const allKnownKeys = Object.values(dictionaries).flatMap(d => Object.keys(d));
                                                allKnownKeys.push('intention'); // Ocultar intention del listado genérico
                                                
                                                itemsToRender = selectedRegistration.answers
                                                    .filter(a => !allKnownKeys.includes(a.question))
                                                    .map(a => ({
                                                        label: a.question.replace(/([A-Z])/g, ' $1').toUpperCase().trim(),
                                                        val: a.answer || ''
                                                    }));
                                            }

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

                                            return itemsToRender.map((item, idx) => (
                                                <div key={idx} className={`group ${item.val?.length > 70 ? 'md:col-span-2' : ''}`}>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 group-hover:text-blue-600 transition-colors">
                                                        {item.label}
                                                    </p>
                                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-sm group-hover:bg-white group-hover:border-blue-100 transition-all min-h-[50px] flex items-center">
                                                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                                            {item.val ? item.val : <span className="text-slate-300 italic text-xs">Sin completar</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-slate-50 flex justify-between items-center border-t border-slate-100 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fecha de Registro</p>
                                    <p className="text-xs font-bold text-slate-700">{selectedRegistration.date}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setSelectedRegistration(null)} className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Cerrar</button>

                                {selectedRegistration.is_deleted ? (
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => {
                                                setRegistrationToDelete(selectedRegistration);
                                                setIsConfirmDeleteOpen(true);
                                            }}
                                            className="px-8 py-3 text-red-500 hover:bg-red-50 font-bold text-xs uppercase tracking-widest rounded-sm transition-all border border-transparent hover:border-red-100"
                                        >
                                            Eliminar Definitivamente
                                        </button>
                                        <button onClick={() => handleRestore(selectedRegistration.id)} className="px-8 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">
                                            Restaurar Solicitud
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {selectedRegistration.status === 'PENDING_REVIEW' && (
                                            <>
                                                <button
                                                    onClick={() => handleSoftDelete(selectedRegistration)}
                                                    disabled={isSubmitting}
                                                    className="px-6 py-3 text-slate-400 hover:text-red-500 font-bold text-xs uppercase tracking-widest rounded-sm transition-all border border-transparent hover:border-red-100 disabled:opacity-50"
                                                >
                                                    Enviar a Papelera
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(selectedRegistration, 'REJECTED')}
                                                    disabled={isSubmitting}
                                                    className="px-6 py-3 text-red-500 hover:bg-red-50 font-bold text-xs uppercase tracking-widest rounded-sm transition-all border border-transparent hover:border-red-100 disabled:opacity-50"
                                                >
                                                    Rechazar
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(selectedRegistration, 'PENDING_PAYMENT')}
                                                    disabled={isSubmitting}
                                                    className="px-10 py-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-sm shadow-2xl shadow-slate-900/10 hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {isSubmitting ? 'Procesando...' : 'Aprobar Solicitud'}
                                                </button>
                                            </>
                                        )}
                                        {selectedRegistration.status !== 'PENDING_REVIEW' && (
                                            <button
                                                onClick={() => setSelectedRegistration(null)}
                                                className="px-8 py-3 bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-sm hover:bg-slate-200 transition-all"
                                            >
                                                Cerrar Vista
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Assignment Portal ("The Brain") */}
            {isAssignModalOpen && selectedRegistration && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setIsAssignModalOpen(false)}>
                    <div className="formal-modal max-w-xl w-full p-0 flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-none">Confirmar ingreso</h3>
                            <p className="text-sm text-slate-500">Asignación de cupo y verificación final para <strong>{selectedRegistration.name}</strong>.</p>
                        </div>

                        <div className="p-10 space-y-10 bg-white">
                            {/* 1. Payment Verification */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">1. Verificación de Cobro</h4>
                                <div className="space-y-4">
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={paymentConfirmed}
                                            onChange={e => setPaymentConfirmed(e.target.checked)}
                                            className="w-5 h-5 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Confirmar recepción de fondos</span>
                                    </label>

                                    {paymentConfirmed && (
                                        <div className="animate-fade-in pl-9 space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Canal de pago</label>
                                                <select
                                                    value={paymentMethod}
                                                    onChange={e => setPaymentMethod(e.target.value)}
                                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400"
                                                >
                                                    <option value="MERCADO_PAGO">Mercado Pago</option>
                                                    <option value="TRANSFER">Transferencia Directa</option>
                                                    <option value="CASH">Efectivo / Manual</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Monto Abonado ($)</label>
                                                <input
                                                    type="number"
                                                    value={paymentAmount}
                                                    onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                                    placeholder="Ej: 50000"
                                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Cycle Assignment */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">2. Asignación de Calendario</h4>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
                                            {isCombo(selectedRegistration.selectedPackage) ? 'Tramo 1 (Ciclo Inicial)' : 'Ciclo de cursada'}
                                        </label>
                                        <select
                                            value={selectedCycleId}
                                            onChange={e => setSelectedCycleId(e.target.value)}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400"
                                        >
                                            <option value="">Seleccionar fecha...</option>
                                            {cycles.filter(c => !isCombo(selectedRegistration.selectedPackage) || c.type === 'initial').map(cycle => (
                                                <option key={cycle.id} value={cycle.id}>
                                                    {cycle.name} | {cycle.start_date} ({cycle.enrolled_count}/{cycle.capacity})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {isCombo(selectedRegistration.selectedPackage) && (
                                        <div className="animate-fade-in">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Tramo 2 (Ciclo Avanzado)</label>
                                            <select
                                                value={selectedCycleId2}
                                                onChange={e => setSelectedCycleId2(e.target.value)}
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-1 focus:ring-blue-400"
                                            >
                                                <option value="">A definir según calendario...</option>
                                                {cycles.filter(c => c.type === 'advanced').map(cycle => (
                                                    <option key={cycle.id} value={cycle.id}>
                                                        {cycle.name} | {cycle.start_date}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 flex gap-4 border-t border-slate-100">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="flex-1 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmEnrollment}
                                disabled={!paymentConfirmed || !selectedCycleId || isSubmitting || paymentAmount === ''}
                                className={`flex-1 py-3 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm shadow-xl shadow-blue-500/20 transition-all ${(!paymentConfirmed || !selectedCycleId || paymentAmount === '') ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-700 hover:scale-[1.01]'}`}
                            >
                                {isSubmitting ? 'Procesando...' : 'FINALIZAR INSCRIPCIÓN'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Confirm Permanent Delete Modal */}
            {isConfirmDeleteOpen && registrationToDelete && createPortal(
                <div className="full-screen-modal-overlay" onClick={() => setIsConfirmDeleteOpen(false)}>
                    <div className="formal-modal max-w-md w-full p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                                <TrashIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar definitivamente?</h3>
                            <p className="text-sm text-slate-500 mb-8">
                                Estás a punto de borrar permanentemente a <strong>{registrationToDelete.name}</strong>. Esta acción no se puede deshacer.
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

export default AdminAdmissions;
