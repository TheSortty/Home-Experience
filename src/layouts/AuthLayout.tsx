import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import InteractiveBg from '../features/landing/InteractiveBg';

const LoadingFallback = () => (
    <div className="min-h-screen bg-slate-900" />
);

export const AuthLayout: React.FC = () => {
    return (
        <div className="relative font-sans text-slate-900 antialiased bg-transparent selection:bg-blue-100 selection:text-blue-900">
            <InteractiveBg />
            
            <Suspense fallback={<LoadingFallback />}>
                <main>
                    <Outlet />
                </main>
            </Suspense>
        </div>
    );
};
