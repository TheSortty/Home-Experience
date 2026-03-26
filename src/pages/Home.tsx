import React, { useState, useEffect, Suspense, lazy } from 'react';
import gsap from 'gsap';

// Landing Features (Lazy Loaded)
const Hero = lazy(() => import('../features/landing/Hero'));
const WhoWeAre = lazy(() => import('../features/landing/WhoWeAre'));
const Coaching = lazy(() => import('../features/landing/Coaching'));
const Programs = lazy(() => import('../features/landing/Programs'));
const Retreats = lazy(() => import('../features/landing/Retreats'));
const Impact = lazy(() => import('../features/landing/Impact'));
const MomentsSwiper = lazy(() => import('../features/landing/MomentsSwiper'));
const Testimonials = lazy(() => import('../features/landing/Testimonials'));
const Contact = lazy(() => import('../features/landing/Contact'));
const VideoSection = lazy(() => import('../features/landing/VideoSection'));
const InteractivePoints = lazy(() => import('../features/landing/InteractivePoints'));
const Location = lazy(() => import('../features/landing/Location'));

// Modals
import ProgramDetailModal from '../features/landing/ProgramDetailModal';
import ProgramSelectionModal from '../features/landing/ProgramSelectionModal';
import TestimonialModal from '../ui/TestimonialModal';
const TestimonialListModal = lazy(() => import('../ui/TestimonialListModal'));

const Home: React.FC = () => {
  // Modal states from original App.tsx
  const [selectedTestimonial, setSelectedTestimonial] = useState<any>(null);
  const [isViewAllTestimonialsOpen, setIsViewAllTestimonialsOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // GSAP Context Cleanup mapping to user requirement
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Setup Intersection Observer inside context so it can be cleaned up if needed
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
            entry.target.classList.remove('opacity-0');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '50px' });

      const observeElements = () => {
        const animatedElements = document.querySelectorAll('.reveal-on-scroll');
        animatedElements.forEach(el => observer.observe(el));
      };

      observeElements();
      const timeoutId = setTimeout(observeElements, 1000);

      // We cannot easily destroy IntersectionObserver via gsap context, but we will clean it up on unmount
      return () => {
        observer.disconnect();
        clearTimeout(timeoutId);
      };
    });

    return () => ctx.revert();
  }, [isSelectionModalOpen, selectedProgramId]);

  // Body Scroll Lock for Modals
  useEffect(() => {
    if (isSelectionModalOpen || selectedProgramId || selectedTestimonial || isViewAllTestimonialsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSelectionModalOpen, selectedProgramId, selectedTestimonial, isViewAllTestimonialsOpen]);

  return (
    <div className="home-page-container">
      {/* 1. EXPERIENCIA HOME (Hero) */}
      <div className="reveal-on-scroll opacity-0">
        <Hero onRegisterClick={() => setIsSelectionModalOpen(true)} />
      </div>

      {/* 2. VIDEO HIGHLIGHT */}
      <div className="reveal-on-scroll opacity-0">
        <VideoSection />
      </div>

      {/* 3. QUIENES SOMOS */}
      <div className="reveal-on-scroll opacity-0">
        <WhoWeAre onConfioClick={() => { }} />
      </div>

      {/* 4. COACHING */}
      <div className="reveal-on-scroll opacity-0">
        <Coaching />
      </div>

      {/* 5. PROGRAMAS */}
      <div className="reveal-on-scroll opacity-0">
        <Programs onLearnMore={(id) => setSelectedProgramId(id)} />
      </div>

      {/* 6. VIAJES & RETIROS */}
      <div className="reveal-on-scroll opacity-0">
        <Retreats />
      </div>

      <div className="reveal-on-scroll opacity-0">
        <MomentsSwiper />
      </div>

      {/* 7. TESTIMONIOS */}
      <div className="relative reveal-on-scroll opacity-0">
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
      <div className="reveal-on-scroll opacity-0">
        <Impact />
      </div>

      {/* 9. UBICACIÓN */}
      <div className="reveal-on-scroll opacity-0">
        <Location />
      </div>

      {/* 10. CONTACTO */}
      <div className="reveal-on-scroll opacity-0">
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
            setIsViewAllTestimonialsOpen(false);
            setSelectedTestimonial(t);
          }}
        />
      </Suspense>

      {/* Program Modals */}
      {isSelectionModalOpen && (
        <ProgramSelectionModal
          onClose={() => setIsSelectionModalOpen(false)}
          onSelectProgram={(id: string) => {
            setIsSelectionModalOpen(false);
            setSelectedProgramId(id);
          }}
          onStartRegistration={() => {
            /* Now handled by routing later or modal */
            window.location.href = '/auth/register';
          }}
        />
      )}

      {selectedProgramId && (
        <React.Suspense fallback={null}>
          <ProgramDetailModal
            programId={selectedProgramId}
            onClose={() => setSelectedProgramId(null)}
            onBack={() => {
              setSelectedProgramId(null);
              setIsSelectionModalOpen(true);
            }}
            onStartRegistration={() => {
              window.location.href = '/auth/register';
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default Home;
