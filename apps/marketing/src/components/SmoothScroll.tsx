'use client'

import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export const SmoothScroll = ({ locked }: { locked?: boolean }) => {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
        });

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        // Expose lenis instance to window for debugging or control if needed
        // @ts-ignore
        window.lenis = lenis;

        return () => {
            lenis.destroy();
        };
    }, []);

    // Effect to handle locking
    useEffect(() => {
        // @ts-ignore
        if (window.lenis) {
            if (locked) {
                // @ts-ignore
                window.lenis.stop();
            } else {
                // @ts-ignore
                window.lenis.start();
            }
        }
    }, [locked]);

    return null;
};
