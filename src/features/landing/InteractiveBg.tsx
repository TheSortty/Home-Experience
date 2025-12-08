import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';


const InteractiveBg: React.FC = () => {
    const bgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const bg = bgRef.current;
        if (!bg) return;

        // GSAP QuickSetter for high performance updates
        const xSet = gsap.quickSetter(bg, "x", "px");
        const ySet = gsap.quickSetter(bg, "y", "px");

        const handleMouseMove = (e: MouseEvent) => {
            // Calculate movement opposite to mouse position (Parallax)
            // Factor 0.02 means the background moves 2% of the mouse distance
            const x = (window.innerWidth / 2 - e.clientX) * 0.02;
            const y = (window.innerHeight / 2 - e.clientY) * 0.02;

            xSet(x);
            ySet(y);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-slate-50">
            {/* Subtle Gradient Base */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-blue-50/30" />

            {/* Moving Geometric Pattern */}
            {/* Moving Geometric Pattern (Watermark) */}
            <div
                ref={bgRef}
                className="absolute inset-[-10%] w-[120%] h-[120%] opacity-40 transition-transform duration-100 ease-out"
            >
                {/* PNG Watermark */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] max-w-[1200px] aspect-square animate-spin-slow" style={{ animationDuration: '180s' }}>
                    <img
                        src="/src/assets/patterns/watermark.png"
                        alt=""
                        className="w-full h-full object-contain opacity-5 transform rotate-12"
                    />
                </div>
            </div>

            {/* Noise Texture for premium feel */}
            <div className="absolute inset-0 opacity-[0.03] mixed-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />
        </div>
    );
};

export default InteractiveBg;
