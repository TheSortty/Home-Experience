import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import DocumentIcon from '../../../ui/icons/DocumentIcon';

interface ActivityLog {
    id: string;
    action: string;
    details: any;
    created_at: string;
}

const AdminLogs: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (!error && data) {
            setLogs(data);
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            <div className="flex justify-between items-center bg-white p-6 formal-card">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Registro de Auditoría</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Historial de movimientos del sistema</p>
                </div>
                <button onClick={fetchLogs} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-sm text-slate-400 transition-colors shadow-sm border border-slate-100">
                    Actualizar
                </button>
            </div>

            <div className="formal-card overflow-hidden bg-white">
                <div className="divide-y divide-slate-50">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">Cargando registros...</div>
                    ) : logs.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                            <DocumentIcon className="w-8 h-8 opacity-20 mb-4" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No hay actividad reciente</p>
                        </div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="p-6 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 text-sm tracking-tight leading-none mb-1">
                                        {log.action.replace(/_/g, ' ')}
                                    </h4>
                                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                                        {log.details?.description || JSON.stringify(log.details)}
                                    </p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            ADMIN: <span className="text-blue-600">{log.details?.adminEmail || 'Sistema'}</span>
                                        </span>
                                        <span className="text-slate-200">|</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(log.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminLogs;
