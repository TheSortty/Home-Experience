import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // We use a small timeout to let the new page render before forcing scroll
        setTimeout(() => {
            // @ts-ignore - lenis is exposed globally in SmoothScroll.tsx
            if (window.lenis) {
                // @ts-ignore
                window.lenis.scrollTo(0, { immediate: true });
            }
            window.scrollTo(0, 0);
        }, 50);
    }, [pathname]);

    return null;
};
