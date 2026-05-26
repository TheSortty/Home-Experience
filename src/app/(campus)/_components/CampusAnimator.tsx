'use client';

/**
 * CampusAnimator
 * ──────────────
 * Mounted once in the campus layout (renders null).
 * Re-runs animations on every route change via `dependencies: [pathname]`.
 *
 * What it does:
 *  1. Smooth page-content entrance on every navigation
 *  2. ScrollTrigger.batch reveal for [data-anim="card"] — staggered cards
 *  3. ScrollTrigger.batch reveal for [data-anim="reveal"] — generic fade-up
 *  4. Respects prefers-reduced-motion
 */

import { useGSAP }     from '@gsap/react';
import gsap            from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePathname } from 'next/navigation';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function CampusAnimator() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      /* ── Reduced motion: just ensure everything is visible ── */
      mm.add('(prefers-reduced-motion: reduce)', () => {
        document
          .querySelectorAll('[data-anim]')
          .forEach((el) => ((el as HTMLElement).style.opacity = '1'));
      });

      /* ── Full animations ──────────────────────────────────── */
      mm.add('(prefers-reduced-motion: no-preference)', () => {

        // 1. Page entrance — whole <main> fades up
        gsap.from('main', {
          opacity: 0,
          y: 18,
          duration: 0.48,
          ease: 'power2.out',
          clearProps: 'all',
        });

        // 2. Card grid stagger (stat tiles, course cards, agenda rows)
        ScrollTrigger.batch('[data-anim="card"]', {
          onEnter(elements) {
            gsap.from(elements, {
              opacity: 0,
              y: 28,
              scale: 0.975,
              duration: 0.55,
              ease: 'power2.out',
              stagger: 0.07,
              clearProps: 'all',
            });
          },
          start: 'top 92%',
          once: true,
        });

        // 3. Section / heading reveals
        ScrollTrigger.batch('[data-anim="reveal"]', {
          onEnter(elements) {
            gsap.from(elements, {
              opacity: 0,
              y: 14,
              duration: 0.55,
              ease: 'power2.out',
              stagger: 0.05,
              clearProps: 'all',
            });
          },
          start: 'top 90%',
          once: true,
        });

        return () => {
          ScrollTrigger.getAll().forEach((t) => t.kill());
        };
      });

      return () => mm.revert();
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return null;
}
