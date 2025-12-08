import React, { useState, useEffect, Suspense, lazy } from 'react';
import { SmoothScroll } from './components/SmoothScroll';
import Header from './ui/Header';
import Footer from './ui/Footer';
import TestimonialModal from './ui/TestimonialModal';
import { Testimonial } from './core/types';

// Landing Features
import Hero from './features/landing/Hero';
import VideoSection from './features/landing/VideoSection';
import IconWave from './features/landing/IconWave';
import ScrollyFeature from './features/landing/ScrollyFeature';
import VideoCarousel from './features/landing/VideoCarousel';
import InteractivePoints from './features/landing/InteractivePoints';
import Testimonials from './features/landing/Testimonials';
import Packages from './features/landing/Packages';
import Contact from './features/landing/Contact';
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
  const [isAddTestimonialOpen, setIsAddTestimonialOpen] = useState(false);
  const [isViewAllTestimonialsOpen, setIsViewAllTestimonialsOpen] = useState(false);

  // Navigation Handlers
  const handleLoginClick = () => setCurrentView('login');
  const handleLoginSuccess = () => setCurrentView('dashboard');
  const handleBackToHome = () => setCurrentView('landing');
  const handleLogout = () => setCurrentView('landing');

  const handleRegisterClick = () => setCurrentView('register');
  const handleRegisterTest = () => setCurrentView('register');

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
        <FloatingShapes />
        <ElegantDecorations />

        <Header onLoginClick={handleLoginClick} />

        <main>
          {/* 1. Welcome / Hero */}
          <div className="reveal-on-scroll opacity-0">
            <Hero onRegisterClick={handleRegisterClick} />
          </div>

          {/* 2. Video Section */}
          <div className="reveal-on-scroll opacity-0">
            <VideoSection />
          </div>

          {/* 3. Icon Wave (Philosophy) */}
          <div className="reveal-on-scroll opacity-0">
            <IconWave />
          </div>

          {/* 4. Scrollytelling Methodology */}
          <ScrollyFeature />

          {/* 5. Video Carousel (Moments) */}
          <div className="reveal-on-scroll opacity-0">
            <VideoCarousel />
          </div>

          {/* 6. Voces/Blog + Background */}
          <div className="relative reveal-on-scroll opacity-0">
            <InteractivePoints />
            <div className="relative z-10 pointer-events-none">
              <div className="pointer-events-auto">
                <Testimonials
                  onTestimonialClick={setSelectedTestimonial}
                  onAddTestimonialClick={() => setIsAddTestimonialOpen(true)}
                  onViewAllClick={() => setIsViewAllTestimonialsOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* 7. Pricing */}
          <div className="reveal-on-scroll opacity-0">
            <Packages onRegisterClick={handleRegisterClick} />
          </div>

          {/* 8. Location */}
          <div className="reveal-on-scroll opacity-0">
            <Location />
          </div>

          {/* 9. Contact & Footer */}
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
          <AddTestimonial
            isVisible={isAddTestimonialOpen}
            onClose={() => setIsAddTestimonialOpen(false)}
          />
          <TestimonialListModal
            isVisible={isViewAllTestimonialsOpen}
            onClose={() => setIsViewAllTestimonialsOpen(false)}
            onTestimonialClick={(t) => {
              setIsViewAllTestimonialsOpen(false);
              setSelectedTestimonial(t);
            }}
          />
        </Suspense>
      </div>
    </>
  );
};

export default App;