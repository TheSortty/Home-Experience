'use client'

import { useState, useEffect, Suspense } from 'react'
import React from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/src/contexts/AuthContext'
import dynamic from 'next/dynamic'

gsap.registerPlugin(useGSAP, ScrollTrigger)

// Landing Features (Lazy Loaded via Next.js Dynamic Imports)
const Hero = dynamic(() => import('@/src/features/landing/Hero'), { ssr: true }) // Hero should stay SSR for LCP
const WhoWeAre = dynamic(() => import('@/src/features/landing/WhoWeAre'), { ssr: false })
const Coaching = dynamic(() => import('@/src/features/landing/Coaching'), { ssr: false })
const Programs = dynamic(() => import('@/src/features/landing/Programs'), { ssr: false })
const Retreats = dynamic(() => import('@/src/features/landing/Retreats'), { ssr: false })
const Impact = dynamic(() => import('@/src/features/landing/Impact'), { ssr: false })
const MomentsSwiper = dynamic(() => import('@/src/features/landing/MomentsSwiper'), { ssr: false })
const Testimonials = dynamic(() => import('@/src/features/landing/Testimonials'), { ssr: false })
const Contact = dynamic(() => import('@/src/features/landing/Contact'), { ssr: false })
const VideoSection = dynamic(() => import('@/src/features/landing/VideoSection'), { ssr: false })
const InteractivePoints = dynamic(() => import('@/src/features/landing/InteractivePoints'), { ssr: false })
const Location = dynamic(() => import('@/src/features/landing/Location'), { ssr: false })

// Modals
import ProgramDetailModal from '@/src/features/landing/ProgramDetailModal'
import ProgramSelectionModal from '@/src/features/landing/ProgramSelectionModal'
import TestimonialModal from '@/src/ui/TestimonialModal'
const TestimonialListModal = dynamic(() => import('@/src/ui/TestimonialListModal'))

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTestimonial, setSelectedTestimonial] = useState<any>(null)
  const [isViewAllTestimonialsOpen, setIsViewAllTestimonialsOpen] = useState(false)
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const { role } = useAuth()

  // Handle ?select=true from Header
  useEffect(() => {
    if (searchParams?.get('select') === 'true') {
      setIsSelectionModalOpen(true)
      // Clear the query param without a full reload
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  // GSAP scroll reveal — replaces IntersectionObserver
  useGSAP(() => {
    const mm = gsap.matchMedia()

    /* Reduced motion: ensure all sections are visible, no transitions */
    mm.add('(prefers-reduced-motion: reduce)', () => {
      document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        ;(el as HTMLElement).style.opacity = '1'
        ;(el as HTMLElement).style.transform = 'none'
      })
    })

    /* Full animations ───────────────────────────────────────────────── */
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Hide all sections upfront (runs as layout effect → no flash)
      gsap.set('.reveal-on-scroll', { opacity: 0, y: 40 })

      ScrollTrigger.batch('.reveal-on-scroll', {
        onEnter(elements) {
          gsap.to(elements, {
            opacity: 1,
            y: 0,
            duration: 0.82,
            ease: 'power2.out',
            stagger: 0.1,
            clearProps: 'all',
          })
        },
        start: 'top 88%',
        once: true,
      })

      // Lazy-loaded sections mount asynchronously — refresh trigger
      // positions at two intervals to catch late arrivals
      const t1 = setTimeout(() => ScrollTrigger.refresh(), 400)
      const t2 = setTimeout(() => ScrollTrigger.refresh(), 1200)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        ScrollTrigger.getAll().forEach((st) => st.kill())
      }
    })

    return () => mm.revert()
  })

  // Body scroll lock for modals
  useEffect(() => {
    if (isSelectionModalOpen || selectedProgramId || selectedTestimonial || isViewAllTestimonialsOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isSelectionModalOpen, selectedProgramId, selectedTestimonial, isViewAllTestimonialsOpen])

  return (
    <div className="home-page-container">
      {/* 1. HERO — above the fold; Hero animates its own elements */}
      <Hero onRegisterClick={() => setIsSelectionModalOpen(true)} />

      {/* 2. VIDEO HIGHLIGHT */}
      <div className="reveal-on-scroll">
        <VideoSection />
      </div>

      {/* 3. QUIENES SOMOS */}
      <div className="reveal-on-scroll">
        <WhoWeAre onConfioClick={() => {}} />
      </div>

      {/* 4. COACHING */}
      <div className="reveal-on-scroll">
        <Coaching />
      </div>

      {/* 5. PROGRAMAS */}
      <div className="reveal-on-scroll">
        <Programs onLearnMore={(id) => setSelectedProgramId(id)} />
      </div>

      {/* 6. VIAJES & RETIROS */}
      <div className="reveal-on-scroll">
        <Retreats />
      </div>

      <div className="reveal-on-scroll">
        <MomentsSwiper />
      </div>

      {/* 7. TESTIMONIOS */}
      <div className="relative reveal-on-scroll">
        <InteractivePoints />
        <div className="relative z-10 pointer-events-none">
          <div className="pointer-events-auto">
            <Testimonials
              onTestimonialClick={setSelectedTestimonial}
              onViewAllClick={() => setIsViewAllTestimonialsOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* 8. IMPACTOS */}
      <div className="reveal-on-scroll">
        <Impact />
      </div>

      {/* 9. UBICACIÓN */}
      <div className="reveal-on-scroll">
        <Location />
      </div>

      {/* 10. CONTACTO */}
      <div className="reveal-on-scroll">
        <Contact />
      </div>

      {/* Modals */}
      <TestimonialModal
        testimonial={selectedTestimonial}
        onClose={() => setSelectedTestimonial(null)}
      />
      <Suspense fallback={null}>
        <TestimonialListModal
          isVisible={isViewAllTestimonialsOpen}
          onClose={() => setIsViewAllTestimonialsOpen(false)}
          onTestimonialClick={(t: any) => {
            setIsViewAllTestimonialsOpen(false)
            setSelectedTestimonial(t)
          }}
        />
      </Suspense>

      {/* Program Modals */}
      {isSelectionModalOpen && (
        <ProgramSelectionModal
          onClose={() => setIsSelectionModalOpen(false)}
          onSelectProgram={(id: string) => {
            setIsSelectionModalOpen(false)
            setSelectedProgramId(id)
          }}
          onStartRegistration={() => {
            router.push('/auth/register')
          }}
        />
      )}

      {selectedProgramId && (
        <React.Suspense fallback={null}>
          <ProgramDetailModal
            programId={selectedProgramId}
            onClose={() => setSelectedProgramId(null)}
            onBack={() => {
              setSelectedProgramId(null)
              setIsSelectionModalOpen(true)
            }}
            onStartRegistration={() => {
              if (selectedProgramId === 'evolucion' || selectedProgramId === 'vincularte') {
                const programName = selectedProgramId === 'evolucion' ? 'Evolución' : 'Vincularte'
                const waNumber = '5491130586930'
                const message = encodeURIComponent(`¡Hola! Quisiera más información sobre el programa ${programName}.`)
                window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank')
              } else {
                router.push('/auth/register')
              }
            }}
          />
        </React.Suspense>
      )}
    </div>
  )
}
