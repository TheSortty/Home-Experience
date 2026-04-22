'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/services/supabaseClient';
import { IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import '@/src/features/auth/Login.css';

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Verificar si hay sesión antes de permitir el cambio
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('El enlace ha expirado o no es válido. Por favor, solicita uno nuevo.');
      }
      setCheckingSession(false);
    });
  }, [supabase]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);

    if (updateError) {
      if (updateError.message.includes('missing')) {
        setError('Tu sesión expiró. Vuelve a iniciar sesión o solicita otro enlace.');
      } else {
        setError(updateError.message);
      }
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    }
  };

  return (
    <div className="relative w-full z-10 flex flex-col items-center">
      <div className="absolute -top-16 text-3xl font-black tracking-tighter text-[#00A9CE] mb-4">HOME<span className="text-slate-900">.</span></div>

      <div className="w-full max-w-md mx-auto">
        <div className="w-full">
          <div className="w-full flex justify-center">
            <div className="col-12 text-center align-self-center py-5">
              <div className="section pb-5 pt-5 pt-sm-2 text-center">
                <div className="card-3d-wrap mx-auto" style={{ height: '550px' }}>
                  <div className="card-3d-wrapper">
                    <div className="card-front">
                      <div className="center-wrap">
                        <div className="section text-center">
                          <h4 className="mb-4 pb-3 text-white">
                            {success ? '¡Contraseña Guardada!' : 'Crear Contraseña'}
                          </h4>

                          {checkingSession ? (
                            <div className="flex justify-center my-8">
                              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                            </div>
                          ) : success ? (
                            <div className="px-4">
                              <p className="text-sm text-white/70 mb-6">
                                Tu contraseña se ha actualizado correctamente. Te estamos redirigiendo a tu espacio...
                              </p>
                              <div className="flex justify-center text-[#00A9CE]">
                                <IoLockClosedOutline size={48} />
                              </div>
                            </div>
                          ) : error.includes('enlace') ? (
                            <div className="px-4">
                              <div className="bg-red-500/10 text-red-400 p-4 rounded-md text-sm font-medium border border-red-500/20 text-center">
                                {error}
                              </div>
                              <button
                                onClick={() => router.push('/auth/login')}
                                className="login-btn mt-6 w-full flex justify-center items-center gap-2"
                              >
                                IR AL LOGIN
                              </button>
                            </div>
                          ) : (
                            <form onSubmit={handleUpdatePassword}>
                              <p className="text-sm text-white/70 mb-6 px-4">
                                Ingresa tu nueva contraseña para acceder al campus en el futuro.
                              </p>

                              <div className="form-group relative">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  className="form-style pr-12"
                                  placeholder="Nueva Contraseña"
                                  value={password}
                                  onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                  }}
                                  required
                                />
                                <div className="input-icon"><IoLockClosedOutline size={20} /></div>
                                <button 
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white focus:outline-none flex items-center justify-center p-2"
                                >
                                  {showPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
                                </button>
                              </div>

                              <div className="form-group mt-4 relative">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  className="form-style"
                                  placeholder="Confirmar Contraseña"
                                  value={confirmPassword}
                                  onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setError('');
                                  }}
                                  required
                                />
                                <div className="input-icon"><IoLockClosedOutline size={20} /></div>
                              </div>

                              {error && !error.includes('enlace') && (
                                <div className="text-red-400 text-sm mt-4 font-medium px-4">
                                  {error}
                                </div>
                              )}

                              <button
                                type="submit"
                                className={`login-btn mt-6 w-full flex justify-center items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                disabled={loading}
                              >
                                {loading ? (
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  'GUARDAR Y ENTRAR'
                                )}
                              </button>
                            </form>
                          )}
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
}
