import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute: React.FC = () => {
    const { session, isLoading } = useAuth();

    // Mostrar un estado de carga mientras verifica
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
                <div className="animate-pulse">Verificando acceso...</div>
            </div>
        );
    }

    // Redirigir al panel de inicio de sesión si no hay sesión
    return session ? <Outlet /> : <Navigate to="/auth/login" replace />;
};
