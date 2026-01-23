import React, { useState, useEffect, Suspense, lazy } from 'react';
import { SmoothScroll } from './components/SmoothScroll';
import { DemoBanner } from './ui/DemoBanner';
import Header from './ui/Header';
import Footer from './ui/Footer';
import TestimonialModal from './ui/TestimonialModal';
import { Testimonial } from './core/types';

// Landing Features
import Hero from './features/landing/Hero';
import WhoWeAre from './features/landing/WhoWeAre';
import Coaching from './features/landing/Coaching';
import Programs from './features/landing/Programs';
import Retreats from './features/landing/Retreats';
import Impact from './features/landing/Impact';
import ProgramDetailModal from './features/landing/ProgramDetailModal';
import ProgramSelectionModal from './features/landing/ProgramSelectionModal';
import MomentsSwiper from './features/landing/MomentsSwiper';
import Testimonials from './features/landing/Testimonials';
import About from './features/landing/About';
import Contact from './features/landing/Contact';

// Utility & Decorative Landing Features
import VideoSection from './features/landing/VideoSection';
import IconWave from './features/landing/IconWave';
import InteractivePoints from './features/landing/InteractivePoints';
import Packages from './features/landing/Packages';
import Location from './features/landing/Location';
import InteractiveBg from './features/landing/InteractiveBg';
import { FloatingShapes } from './features/landing/decorations/FloatingShapes';
import { ElegantDecorations } from './features/landing/decorations/ElegantDecorations';

// Lazy Loaded Features
const Login = lazy(() => import('./features/auth/Login'));
const RegistrationForm = lazy(() => import('./features/auth/RegistrationForm'));
const AdminDashboard = lazy(() => import('./features/dashboard/AdminDashboard'));
const AddTestimonial = lazy(() => import('./features/dashboard/AddTestimonial'));
const TestimonialListModal = lazy(() => import('./ui/TestimonialListModal'));

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

  // Navigation Handlers
  const handleLoginClick = () => setCurrentView('login');
  const handleLoginSuccess = () => setCurrentView('dashboard');
  const handleBackToHome = () => setCurrentView('landing');
  const handleLogout = () => setCurrentView('landing');

  const handleRegisterClick = () => {
    setCurrentView('register');
    setIsSelectionModalOpen(false);
    setSelectedProgramId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleRegisterTest = () => setCurrentView('register');

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
        }
      });
    }, { threshold: 0.1 });

    const animatedElements = document.querySelectorAll('.reveal-on-scroll');
    animatedElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [currentView]);

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
            <DemoBanner />
            <Header onLoginClick={() => setCurrentView('login')} onStartClick={() => setIsSelectionModalOpen(true)} />
          </div>
        )}

        <main>
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

          {/* 6. VIAJES & RETIROS (User requested no changes here) */}
          <div className="reveal-on-scroll opacity-0">
            <Retreats />
          </div>

          {/* Interactive/Logic Carousels (Swiper) */}
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

          {/* 9. UBICACIÓN (Moved here as requested: "arriba de contacto") */}
          <div className="reveal-on-scroll opacity-0">
            <Location />
          </div>

          {/* 10. CONTACTO & Footer */}
          <div className="bg-white pt-20 reveal-on-scroll opacity-0">
            <Contact />
            <Footer onEasterEggClick={() => { }} />
          </div>
        </main>

        {/* Modals */}
        <TestimonialModal
          testimonial={selectedTestimonial}
          onClose={() => setSelectedTestimonial(null)}
        />
        <Suspense fallback={null}>
          <TestimonialListModal
            isVisible={isViewAllTestimonialsOpen}
            onClose={() => setIsViewAllTestimonialsOpen(false)}
            onTestimonialClick={(t) => {
              setIsViewAllTestimonialsOpen(false);
              setSelectedTestimonial(t);
            }}
          />
        </Suspense>

        {/* Program Modals */}
        {isSelectionModalOpen && (
          <ProgramSelectionModal
            onClose={() => setIsSelectionModalOpen(false)}
            onSelectProgram={(id) => {
              setIsSelectionModalOpen(false);
              setSelectedProgramId(id);
            }}
            onStartRegistration={handleRegisterClick}
          />
        )}

        {selectedProgramId && (
          <ProgramDetailModal
            programId={selectedProgramId}
            onClose={() => setSelectedProgramId(null)}
            onStartRegistration={handleRegisterClick}
          />
        )}
      </div >
    </>
  );
};

export default App;