'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/services/supabaseClient';
import { IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import '@/src/features/auth/Login.css';

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession]           = useState(false);

  // Verificar si hay sesión activa (OTP de invitación ya canjeado en /auth/callback)
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setHasSession(!!session);
        if (!session) setError('El enlace ha expirado o no es válido. Solicitá uno nuevo.');
      })
      .catch(() => {
        setError('No se pudo verificar la sesión. Volvé a intentarlo.');
      })
      .finally(() => {
        setCheckingSession(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message.includes('missing')
          ? 'Tu sesión expiró. Solicitá un nuevo enlace de acceso.'
          : updateError.message
        );
        return;
      }

      // Cerrar la sesión temporal de invitación y redirigir al login
      await supabase.auth.signOut();
      setSuccess(true);

      // Pequeña pausa para que el usuario vea el mensaje de éxito
      setTimeout(() => {
        router.push('/auth/login?message=password_set');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full z-10 flex flex-col items-center">
      <div className="absolute -top-16 text-3xl font-black tracking-tighter text-[#00A9CE] mb-4">
        HOME<span className="text-slate-900">.</span>
      </div>

      <div className="w-full max-w-md mx-auto">
        <div className="col-12 text-center align-self-center py-5">
          <div className="section pb-5 pt-5 pt-sm-2 text-center">
            <div className="card-3d-wrap mx-auto" style={{ height: '520px' }}>
              <div className="card-3d-wrapper">
                <div className="card-front">
                  <div className="center-wrap">
                    <div className="section text-center">

                      {checkingSession ? (
                        // ── Verificando sesión ────────────────────────────
                        <div className="flex justify-center my-8">
                          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>

                      ) : success ? (
                        // ── Éxito ─────────────────────────────────────────
                        <>
                          <h4 className="mb-4 pb-3 text-white">¡Listo!</h4>
                          <div className="flex justify-center text-[#00A9CE] mb-4">
                            <IoLockClosedOutline size={48} />
                          </div>
                          <p className="text-sm text-white/70 px-4">
                            Tu contraseña fue creada correctamente. Te redirigimos al inicio de sesión...
                          </p>
                        </>

                      ) : !hasSession ? (
                        // ── Sin sesión válida ──────────────────────────────
                        <>
                          <h4 className="mb-4 pb-3 text-white">Enlace inválido</h4>
                          <div className="bg-red-500/10 text-red-400 p-4 rounded-md text-sm font-medium border border-red-500/20 px-4 text-center mb-6">
                            {error}
                          </div>
                          <button
                            onClick={() => router.push('/auth/login')}
                            className="login-btn w-full flex justify-center items-center gap-2"
                          >
                            IR AL LOGIN
                          </button>
                        </>

                      ) : (
                        // ── Formulario ────────────────────────────────────
                        <>
                          <h4 className="mb-4 pb-3 text-white">Crear Contraseña</h4>
                          <p className="text-sm text-white/70 mb-5 px-4">
                            Ingresá tu nueva contraseña para acceder al campus.
                          </p>

                          <form onSubmit={handleSubmit}>
                            <div className="form-group relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-style pr-12"
                                placeholder="Nueva contraseña"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                required
                              />
                              <div className="input-icon"><IoLockClosedOutline size={20} /></div>
                              <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2"
                              >
                                {showPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
                              </button>
                            </div>

                            <div className="form-group mt-4 relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-style"
                                placeholder="Confirmar contraseña"
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                required
                              />
                              <div className="input-icon"><IoLockClosedOutline size={20} /></div>
                            </div>

                            {error && (
                              <p className="text-red-400 text-sm mt-4 font-medium px-4">{error}</p>
                            )}

                            <button
                              type="submit"
                              disabled={loading}
                              className={`login-btn mt-6 w-full flex justify-center items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              {loading
                                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : 'GUARDAR Y ENTRAR'
                              }
                            </button>
                          </form>
                        </>
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
  );
}
