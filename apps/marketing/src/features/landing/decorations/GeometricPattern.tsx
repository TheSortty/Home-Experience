import React from 'react';

export const GeometricPattern: React.FC<{ className?: string }> = ({ className = "" }) => {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`w-full h-full opacity-30 ${className}`}
            preserveAspectRatio="xMidYMid slice"
        >
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.5" />
            {/* Random intersected lines simulating the user's reference */}
            <path d="M5,50 L95,50" stroke="currentColor" strokeWidth="0.5" />
            <path d="M15,20 L85,80" stroke="currentColor" strokeWidth="0.5" />
            <path d="M20,85 L80,15" stroke="currentColor" strokeWidth="0.5" />
            <path d="M50,5 L50,95" stroke="currentColor" strokeWidth="0.5" />
            <path d="M30,10 L70,90" stroke="currentColor" strokeWidth="0.5" />
            <path d="M10,70 L90,30" stroke="currentColor" strokeWidth="0.5" />

            {/* Additional connecting lines for "web" feel */}
            <path d="M25,25 L75,75" stroke="currentColor" strokeWidth="0.2" />
            <path d="M75,25 L25,75" stroke="currentColor" strokeWidth="0.2" />
            <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="0.2" />
        </svg>
    );
};
