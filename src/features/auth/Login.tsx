import React, { useState } from 'react';
import './Login.css';
import { IoClose, IoEyeOutline, IoEyeOffOutline, IoMailOutline, IoLockClosedOutline } from 'react-icons/io5';
import { FcGoogle } from 'react-icons/fc';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';

interface LoginProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotView, setIsForgotView] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Email / Password Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Traducir los errores más comunes
        if (error.message.includes('Invalid login credentials')) {
          setError('Credenciales incorrectas. Verifica tu email y contraseña.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Debes confirmar tu correo electrónico primero.');
        } else {
          setError('Ocurrió un error al iniciar sesión. Intenta más tarde.');
        }
      } else if (data.session) {
        onLoginSuccess();
      }
    } catch (err) {
      setError('Error de conexión. Revisa tu internet.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Next.js callback route: exchanges the OAuth code for a session cookie
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError('No se pudo conectar con Google.');
      }
    } catch (err) {
      setError('Error al conectar con Google.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, ingresá tu correo.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // /auth/callback will exchange the recovery code, then redirect to dashboard
        redirectTo: `${window.location.origin}/auth/callback?next=/admin/dashboard`
      });
      if (error) {
        setError('Error al enviar el correo de recuperación.');
      } else {
        toast.success('Te enviamos un correo con un link. Revisá tu bandeja de entrada (y spam).', { duration: 6000 });
        setIsForgotView(false); // volver al login
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full z-10 flex flex-col items-center">
      <div className="absolute -top-16 text-3xl font-black tracking-tighter text-[#00A9CE] mb-4">HOME<span className="text-slate-900">.</span></div>

      <button
        onClick={onBack}
        className="absolute -top-16 -left-4 md:-left-12 text-slate-400 hover:text-slate-900 transition-all flex items-center gap-2 group"
      >
        <span className="w-6 h-6 transition-transform group-hover:-translate-x-1 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </span>
        <span className="font-bold uppercase tracking-widest text-xs">Volver</span>
      </button>

      <div className="w-full">
        <div className="w-full">
          <div className="w-full flex justify-center">
            <div className="col-12 text-center align-self-center py-5">
              <div className="section pb-5 pt-5 pt-sm-2 text-center">
                <div className="card-3d-wrap mx-auto" style={{ height: '550px' }}>
                  <div className="card-3d-wrapper">
                    {/* Log In Card */}
                    <div className="card-front">
                      <div className="center-wrap">
                        <div className="section text-center">
                          <h4 className="mb-4 pb-3">{isForgotView ? 'Recuperar Contraseña' : 'Admin Login'}</h4>
                          
                          <form onSubmit={isForgotView ? handleResetPassword : handleLoginSubmit}>
                            {isForgotView && (
                                <p className="text-sm text-white/70 mb-4 px-4 text-center">
                                    Ingrese el correo electrónico con el cual desea recuperar su contraseña.
                                </p>
                            )}

                            <div className="form-group">
                              <input
                                type="email"
                                className="form-style"
                                placeholder="Correo Electrónico"
                                value={email}
                                onChange={(e) => {
                                  setEmail(e.target.value);
                                  setError('');
                                }}
                                autoComplete="email"
                                required
                              />
                              <div className="input-icon"><IoMailOutline size={20} /></div>
                            </div>

                            {!isForgotView && (
                                <div className="form-group mt-4 relative">
                                  <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-style pr-12"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => {
                                      setPassword(e.target.value);
                                      setError('');
                                    }}
                                    autoComplete="current-password"
                                    required
                                  />
                                  <div className="input-icon"><IoLockClosedOutline size={20} /></div>
                                  <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white focus:outline-none flex items-center justify-center p-2"
                                  >
                                    {showPassword ? (
                                      <span className="w-5 h-5 text-white/50 flex items-center justify-center">
                                        <IoEyeOffOutline size={20} />
                                      </span>
                                    ) : (
                                      <span className="w-5 h-5 flex items-center justify-center">
                                        <IoEyeOutline size={20} />
                                      </span>
                                    )}
                                  </button>
                                </div>
                            )}

                            {error && (
                              <div className="text-red-400 text-sm mt-4 font-medium px-4">
                                {error}
                              </div>
                            )}

                            <button
                              type="submit"
                              className={`login-btn mt-6 w-full flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                isForgotView ? 'ENVIAR ENLACE' : 'INICIAR SESIÓN'
                              )}
                            </button>
                          </form>

                          {!isForgotView && (
                              <div className="mt-6 flex flex-col gap-4">
                                <div className="mt-6 mb-6 flex items-center justify-center">
                                  <div className="h-[1px] w-full bg-white/10" />
                                  <span className="px-4 text-xs font-medium text-white/50 uppercase tracking-wider">O</span>
                                  <div className="h-[1px] w-full bg-white/10" />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleGoogleLogin}
                                  className="w-full relative flex h-11 w-full items-center justify-center gap-3 rounded-md bg-white px-8 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                >
                                  <span className="w-5 h-5 flex items-center justify-center">
                                    <FcGoogle size={20} />
                                  </span>
                                  Continuar con Google
                                </button>
                              </div>
                          )}

                          <div className="mt-4">
                            <button 
                                onClick={() => {
                                    setIsForgotView(!isForgotView);
                                    setError('');
                                }} 
                                type="button" 
                                className="text-white hover:text-[#00A9CE] transition-colors text-sm"
                            >
                                {isForgotView ? 'Volver al inicio de sesión' : '¿Olvidaste tu contraseña?'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;