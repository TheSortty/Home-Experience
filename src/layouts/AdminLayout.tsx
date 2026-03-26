import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-pulse">Loading Admin...</div>
    </div>
);

export const AdminLayout: React.FC = () => {
    return (
        <div className="relative font-sans text-slate-900 antialiased bg-slate-50 min-h-screen">
            <Suspense fallback={<LoadingFallback />}>
                <Outlet />
            </Suspense>
        </div>
    );
};
