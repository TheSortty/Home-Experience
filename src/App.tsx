import React, { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ScrollToTop } from './components/routing/ScrollToTop';
import { ProtectedRoute } from './components/routing/ProtectedRoute';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./features/auth/Login'));
const RegistrationForm = lazy(() => import('./features/auth/RegistrationForm'));
import { UpdatePassword } from './features/auth/UpdatePassword';
const AdminDashboard = lazy(() => import('./features/dashboard/AdminDashboard'));

import { useAuth } from './contexts/AuthContext';

// Wrappers para mantener la retrocompatibilidad con las props actuales sin romper los componentes
const LoginWrapper = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && session) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [session, isLoading, navigate]);

  return <Login onLoginSuccess={() => navigate('/admin/dashboard')} onBack={() => navigate('/')} />;
};

const RegistrationWrapper = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && session) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [session, isLoading, navigate]);

  return <RegistrationForm onSubmitSuccess={() => navigate('/')} onBack={() => navigate('/')} />;
};

const AdminWrapper = () => {
  const navigate = useNavigate();
  return <AdminDashboard onLogout={() => navigate('/')} onRegisterTest={() => navigate('/auth/register')} />;
};

const App: React.FC = () => {
  const { isPasswordRecovery, setIsPasswordRecovery } = useAuth();

  if (isPasswordRecovery) {
    return (
      <>
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff', borderRadius: '12px' } }} />
        <UpdatePassword onSuccess={() => setIsPasswordRecovery(false)} />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff', borderRadius: '12px' } }} />
      <ScrollToTop />
      <Routes>
        {/* Rutas Públicas */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
        </Route>

        {/* Rutas de Autenticación */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={
            <Suspense fallback={null}>
              <LoginWrapper />
            </Suspense>
          } />
          <Route path="register" element={
            <Suspense fallback={null}>
              <RegistrationWrapper />
            </Suspense>
          } />
          <Route index element={<Navigate to="/auth/login" replace />} />
        </Route>

        {/* Rutas Protegidas de Administración */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={
              <Suspense fallback={null}>
                <AdminWrapper />
              </Suspense>
            } />
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;