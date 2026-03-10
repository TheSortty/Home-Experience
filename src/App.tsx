import React, { useState, useEffect, Suspense, lazy } from 'react';
import { SmoothScroll } from './components/SmoothScroll';
import Header from './ui/Header';
import Footer from './ui/Footer';
import TestimonialModal from './ui/TestimonialModal';
import { Testimonial } from './core/types';

// Landing Features (Lazy Loaded)
const Hero = lazy(() => import('./features/landing/Hero'));
const WhoWeAre = lazy(() => import('./features/landing/WhoWeAre'));
const Coaching = lazy(() => import('./features/landing/Coaching'));
const Programs = lazy(() => import('./features/landing/Programs'));
const Retreats = lazy(() => import('./features/landing/Retreats'));
const Impact = lazy(() => import('./features/landing/Impact'));
const MomentsSwiper = lazy(() => import('./features/landing/MomentsSwiper'));
const Testimonials = lazy(() => import('./features/landing/Testimonials'));
const About = lazy(() => import('./features/landing/About'));
const Contact = lazy(() => import('./features/landing/Contact'));

// Utility & Decorative Landing Features
const VideoSection = lazy(() => import('./features/landing/VideoSection'));
const InteractivePoints = lazy(() => import('./features/landing/InteractivePoints'));
const Location = lazy(() => import('./features/landing/Location'));

// Essential UI and Modals
import ProgramDetailModal from './features/landing/ProgramDetailModal';
import ProgramSelectionModal from './features/landing/ProgramSelectionModal';
import InteractiveBg from './features/landing/InteractiveBg';
import { FloatingShapes } from './features/landing/decorations/FloatingShapes';
import { ElegantDecorations } from './features/landing/decorations/ElegantDecorations';

// Essential UI (Static)
import IconWave from './features/landing/IconWave';
import Packages from './features/landing/Packages';

// Lazy Loaded Features
const Login = lazy(() => import('./features/auth/Login'));
const RegistrationForm = lazy(() => import('./features/auth/RegistrationForm'));
const AdminDashboard = lazy(() => import('./features/dashboard/AdminDashboard'));
const AddTestimonial = lazy(() => import('./features/dashboard/AddTestimonial'));
const TestimonialListModal = lazy(() => import('./ui/TestimonialListModal'));
const ProgramDetailModalLazy = lazy(() => import('./features/landing/ProgramDetailModal'));
const ProgramSelectionModalLazy = lazy(() => import('./features/landing/ProgramSelectionModal'));

type ViewState = 'landing' | 'login' | 'dashboard' | 'register';

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
    <div className="animate-pulse">Loading...</div>
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [isViewAllTestimonialsOpen, setIsViewAllTestimonialsOpen] = useState(false);
  // Registration/Auth state
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoginHovered, setIsLoginHovered] = useState(false);

  // Program Modal States
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Navigation Handlers (Memoized)
  const handleLoginClick = React.useCallback(() => setCurrentView('login'), []);
  const handleLoginSuccess = React.useCallback(() => setCurrentView('dashboard'), []);
  const handleBackToHome = React.useCallback(() => setCurrentView('landing'), []);
  const handleLogout = React.useCallback(() => setCurrentView('landing'), []);

  const handleRegisterClick = React.useCallback(() => {
    setCurrentView('register');
    setIsSelectionModalOpen(false);
    setSelectedProgramId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleRegisterTest = React.useCallback(() => setCurrentView('register'), []);

  const handleOpenSelection = React.useCallback(() => setIsSelectionModalOpen(true), []);
  const handleCloseSelection = React.useCallback(() => setIsSelectionModalOpen(false), []);
  const handleSelectProgram = React.useCallback((id: string) => {
    setIsSelectionModalOpen(false);
    setSelectedProgramId(id);
  }, []);
  const handleCloseDetail = React.useCallback(() => setSelectedProgramId(null), []);
  const handleViewAllTestimonials = React.useCallback(() => setIsViewAllTestimonialsOpen(true), []);
  const handleCloseAllTestimonials = React.useCallback(() => setIsViewAllTestimonialsOpen(false), []);

  // Body Scroll Lock
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

  // Animation observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
          entry.target.classList.remove('opacity-0');
          // Once animated, we don't need to observe anymore
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '50px' });

    // Function to observe elements
    const observeElements = () => {
      const animatedElements = document.querySelectorAll('.reveal-on-scroll');
      animatedElements.forEach(el => observer.observe(el));
    };

    // Initial observation
    observeElements();

    // Re-scan after a short delay to catch lazy-loaded components
    const timeoutId = setTimeout(observeElements, 1000);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [currentView, isSelectionModalOpen, selectedProgramId]);

  if (currentView === 'login') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <InteractiveBg />
        <Login onLoginSuccess={handleLoginSuccess} onBack={handleBackToHome} />
      </Suspense>
    );
  }

  if (currentView === 'dashboard') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AdminDashboard onLogout={handleLogout} onRegisterTest={handleRegisterTest} />
      </Suspense>
    );
  }

  if (currentView === 'register') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <InteractiveBg />
        <RegistrationForm onBack={handleBackToHome} onSubmitSuccess={handleBackToHome} />
      </Suspense>
    );
  }

  return (
    <>
      <SmoothScroll />
      <div className="relative font-sans text-slate-900 antialiased bg-transparent selection:bg-blue-100 selection:text-blue-900">
        <InteractiveBg />
        {!(isSelectionModalOpen || selectedProgramId) && (
          <div className="fixed top-0 left-0 right-0 z-[9999] flex flex-col">
            <Header onLoginClick={handleLoginClick} onStartClick={handleOpenSelection} />
          </div>
        )}

        <Suspense fallback={<LoadingFallback />}>
          <main>
            {/* 1. EXPERIENCIA HOME (Hero) */}
            <div className="reveal-on-scroll">
              <Hero onRegisterClick={handleOpenSelection} />
            </div>

            {/* 2. VIDEO HIGHLIGHT */}
            <div className="reveal-on-scroll">
              <VideoSection />
            </div>

            {/* 3. QUIENES SOMOS */}
            <div className="reveal-on-scroll">
              <WhoWeAre onConfioClick={() => { }} />
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

            {/* Interactive/Logic Carousels (Swiper) */}
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
                    onViewAllClick={handleViewAllTestimonials}
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

            {/* 10. CONTACTO & Footer */}
            <div className="bg-white pt-20 reveal-on-scroll">
              <Contact />
              <Footer onEasterEggClick={() => { }} />
            </div>
          </main>
        </Suspense>

        {/* Modals */}
        <TestimonialModal
          testimonial={selectedTestimonial}
          onClose={() => setSelectedTestimonial(null)}
        />
        <Suspense fallback={null}>
          <TestimonialListModal
            isVisible={isViewAllTestimonialsOpen}
            onClose={handleCloseAllTestimonials}
            onTestimonialClick={(t) => {
              setIsViewAllTestimonialsOpen(false);
              setSelectedTestimonial(t);
            }}
          />
        </Suspense>

        {/* Program Modals (Suspense Loaded) */}
        <Suspense fallback={null}>
          {isSelectionModalOpen && (
            <ProgramSelectionModalLazy
              onClose={handleCloseSelection}
              onSelectProgram={handleSelectProgram}
              onStartRegistration={handleRegisterClick}
            />
          )}

          {selectedProgramId && (
            <ProgramDetailModalLazy
              programId={selectedProgramId}
              onClose={handleCloseDetail}
              onStartRegistration={handleRegisterClick}
            />
          )}
        </Suspense>
      </div >
    </>
  );
};

export default App;