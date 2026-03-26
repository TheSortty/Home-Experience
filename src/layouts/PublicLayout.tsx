import React, { Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from '../ui/Header';
import Footer from '../ui/Footer';
import InteractiveBg from '../features/landing/InteractiveBg';
import { SmoothScroll } from '../components/SmoothScroll';

const LoadingFallback = () => (
    <div className="min-h-screen bg-slate-900" />
);

export const PublicLayout: React.FC = () => {
    const navigate = useNavigate();

    const handleLoginClick = () => {
        navigate('/auth/login');
    };

    const handleStartClick = () => {
        // Por ahora redirige al home o abre modal según lógica (en MPA idealmente a /auth/register o /programas)
        navigate('/auth/register');
    };

    return (
        <>
            <SmoothScroll />
            <div className="relative font-sans text-slate-900 antialiased bg-transparent selection:bg-blue-100 selection:text-blue-900">
                <InteractiveBg />
                
                <div className="fixed top-0 left-0 right-0 z-[9999] flex flex-col">
                    <Header onLoginClick={handleLoginClick} onStartClick={handleStartClick} />
                </div>

                <Suspense fallback={<LoadingFallback />}>
                    <main>
                        <Outlet />
                    </main>
                </Suspense>

                <div className="bg-white pt-20">
                    <Footer onEasterEggClick={() => {}} />
                </div>
            </div>
        </>
    );
};
