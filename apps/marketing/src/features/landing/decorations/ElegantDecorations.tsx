import React from 'react';

export const ElegantDecorations: React.FC = () => {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            {/* Top Left Corner */}
            <div className="absolute top-12 left-6 md:left-12 w-24 h-24 border-l border-t border-slate-200/50 opacity-60"></div>

            {/* Top Right Corner */}
            <div className="absolute top-12 right-6 md:right-12 w-24 h-24 border-r border-t border-slate-200/50 opacity-60"></div>

            {/* Bottom Left Corner */}
            <div className="absolute bottom-12 left-6 md:left-12 w-24 h-24 border-l border-b border-slate-200/50 opacity-60"></div>

            {/* Bottom Right Corner */}
            <div className="absolute bottom-12 right-6 md:right-12 w-24 h-24 border-r border-b border-slate-200/50 opacity-60"></div>

            {/* Vertical Side Lines */}
            <div className="absolute top-1/2 left-8 w-[1px] h-32 bg-gradient-to-b from-transparent via-slate-200/40 to-transparent -translate-y-1/2 hidden md:block"></div>
            <div className="absolute top-1/2 right-8 w-[1px] h-32 bg-gradient-to-b from-transparent via-slate-200/40 to-transparent -translate-y-1/2 hidden md:block"></div>
        </div>
    );
};

export const ElegantArrowIcon: React.FC<{ className?: string, direction?: 'left' | 'right' | 'up' | 'down' }> = ({ className = "", direction = 'right' }) => {
    let rotation = 'rotate-0';
    if (direction === 'left') rotation = 'rotate-180';
    if (direction === 'up') rotation = '-rotate-90';
    if (direction === 'down') rotation = 'rotate-90';

    return (
        <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 ${rotation} ${className}`} stroke="currentColor" strokeWidth="1">
            <path d="M4 12h16m0 0l-6-6m6 6l-6 6" strokeLinecap="square" strokeLinejoin="miter" />
        </svg>
    );
};
