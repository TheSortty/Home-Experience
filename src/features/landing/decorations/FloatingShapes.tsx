import React, { useEffect, useState } from 'react';

export const FloatingShapes: React.FC = () => {
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setOffset(window.scrollY);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Circle */}
            <div
                className="absolute top-[20%] left-[10%] w-20 h-20 rounded-full border border-blue-100 opacity-40"
                style={{ transform: `translateY(${offset * 0.1}px)` }}
            />

            {/* Square */}
            <div
                className="absolute top-[40%] right-[5%] w-16 h-16 border border-indigo-100 opacity-40 rotate-12"
                style={{ transform: `translateY(${offset * -0.05}px) rotate(${12 + offset * 0.02}deg)` }}
            />

            {/* Triangle (using CSS clip-path) */}
            <div
                className="absolute top-[70%] left-[15%] w-24 h-24 bg-blue-50 opacity-30"
                style={{
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                    transform: `translateY(${offset * 0.08}px)`
                }}
            />

            {/* Dots Grid */}
            <div
                className="absolute top-[60%] right-[15%] w-32 h-32 opacity-20"
                style={{
                    backgroundImage: 'radial-gradient(#2563EB 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                    transform: `translateY(${offset * -0.03}px)`
                }}
            />
        </div>
    );
};
