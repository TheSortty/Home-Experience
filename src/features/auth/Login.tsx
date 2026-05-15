import React, { useState } from 'react';
import './Login.css';
import { IoEyeOutline, IoEyeOffOutline, IoMailOutline, IoLockClosedOutline } from 'react-icons/io5';
import { FcGoogle } from 'react-icons/fc';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
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
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
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
    <div className="relative w-full z-10 flex flex-col items-center max-w-md mx-auto">
      {/* Brand mark at top */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="text-3xl font-black tracking-tighter text-white drop-shadow-[0_4px_20px_rgba(0,169,206,0.4)]">
          HOME<span className="text-[#00A9CE]">.</span>
        </div>
        <span className="text-[10px] font-bold tracking-[0.3em] text-[#8BD8DF]/70 uppercase">
          Management System
        </span>
      </div>

      <div className="w-full">
        <div className="w-full">
          <div className="w-full flex justify-center">
            <div className="col-12 text-center align-self-center py-5">
              <div className="section pb-5 pt-5 pt-sm-2 text-center">
                <div className="card-3d-wrap mx-auto" style={{ height: '600px' }}>
                  <div className="card-3d-wrapper">
                    {/* Log In Card */}
                    <div className="card-front">
                      {/* Decorative top accent */}
                      <div className="card-front__accent" aria-hidden="true" />
                      <div className="card-front__glow" aria-hidden="true" />

                      <div className="center-wrap">
                        <div className="section text-center">
                          {!isForgotView ? (
                            <div className="mb-6 flex flex-col items-center gap-2">
                              <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.4em] uppercase text-[#8BD8DF]/80">
                                <span className="w-6 h-px bg-[#8BD8DF]/40" />
                                Acceso
                                <span className="w-6 h-px bg-[#8BD8DF]/40" />
                              </span>
                              <h1 className="font-serif text-5xl font-bold tracking-tight text-white leading-none">
                                CAMPUS
                              </h1>
                              <p className="text-xs text-white/50 font-medium tracking-wide">
                                Ingresá con tu cuenta de Home
                              </p>
                            </div>
                          ) : (
                            <div className="mb-6 flex flex-col items-center gap-2">
                              <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-[#8BD8DF]/80">
                                Recuperación
                              </span>
                              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                                Recuperar Contraseña
                              </h1>
                            </div>
                          )}

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