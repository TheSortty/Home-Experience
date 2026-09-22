'use client';

import React, { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'home_cookie_consent';

type ConsentLevel = 'all' | 'essential' | null;

/**
 * CookieConsent — Premium cookie consent banner.
 *
 * Shows on first visit. Stores consent in localStorage under COOKIE_CONSENT_KEY.
 * Once accepted, it won't show again. Renders at the bottom of the viewport
 * with a glassmorphism design and smooth slide-up animation.
 */
const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Don't show in admin routes
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return;

    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      // Delay slightly so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = (level: ConsentLevel) => {
    if (!level) return;
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
      }));
      setVisible(false);
      setExiting(false);
    }, 400);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop — subtle, non-intrusive */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998] transition-opacity duration-500 ${
          exiting ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={() => handleAccept('essential')}
      />

      {/* Banner */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[9999] transition-all duration-500 ease-out ${
          exiting
            ? 'translate-y-full opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
        style={{
          animation: exiting ? undefined : 'cookieSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 pb-4 sm:pb-6">
          <div
            className="rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div className="p-5 sm:p-8">
              {/* Header */}
              <div className="flex items-start gap-4 mb-4 sm:mb-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Tu privacidad es importante para nosotros
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                    Usamos cookies para mejorar tu experiencia, analizar el tráfico del sitio y personalizar el contenido.
                    Podés aceptar todas las cookies o solo las esenciales para el funcionamiento del sitio.
                  </p>
                </div>
              </div>

              {/* Cookie types info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-5 sm:mb-6">
                <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Esenciales</span>
                    <span className="text-[10px] text-slate-500">Necesarias para el funcionamiento</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Analíticas</span>
                    <span className="text-[10px] text-slate-500">Nos ayudan a mejorar</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => handleAccept('essential')}
                  className="px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-slate-400 hover:text-white border border-white/10 hover:border-white/25 rounded-xl transition-all hover:bg-white/5"
                >
                  Solo esenciales
                </button>
                <button
                  onClick={() => handleAccept('all')}
                  className="px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-600/30 hover:-translate-y-0.5"
                >
                  Aceptar todas las cookies
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-up keyframe */}
      <style jsx>{`
        @keyframes cookieSlideUp {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default CookieConsent;
