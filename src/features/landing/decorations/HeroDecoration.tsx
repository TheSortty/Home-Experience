import React from 'react';

export const HeroDecoration: React.FC = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <svg className="absolute top-0 right-0 w-1/2 h-full opacity-10" viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M400 0C300 100 100 200 200 400C300 600 100 700 0 800V0H400Z" fill="url(#grad1)" />
                <defs>
                    <linearGradient id="grad1" x1="400" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2563EB" />
                        <stop offset="1" stopColor="#60A5FA" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>
            <svg className="absolute bottom-0 left-0 w-1/3 h-1/2 opacity-5" viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="0" cy="400" r="300" stroke="#1E40AF" strokeWidth="2" strokeDasharray="10 10" className="animate-spin-slow" style={{ animationDuration: '60s' }} />
            </svg>
        </div>
    );
};
