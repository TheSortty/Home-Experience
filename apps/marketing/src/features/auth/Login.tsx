import React, { useState } from 'react';
import Link from 'next/link';
import './LoginNeu.css';
import { IoEyeOutline, IoEyeOffOutline, IoMailOutline, IoLockClosedOutline, IoArrowBack } from 'react-icons/io5';
import { FcGoogle } from 'react-icons/fc';
import { supabase } from '@home/services/supabaseClient';
import toast from 'react-hot-toast';

interface LoginProps {
  onLoginSuccess: () => void;
  /** Aviso arriba del formulario (contraseña creada, link vencido...). */
  notice?: { tone: 'success' | 'error'; text: string } | null;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, notice }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // "Recuperar contraseña" es la segunda cara del mismo panel: al activarla
  // los dos paneles se cruzan (ver .nl--recover en LoginNeu.css).
  const [isForgotView, setIsForgotView] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const switchView = (forgot: boolean) => {
    setIsForgotView(forgot);
    setError('');
  };

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
          setError('Credenciales incorrectas. Verificá tu email y contraseña.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Tenés que confirmar tu correo electrónico primero.');
        } else {
          setError('Ocurrió un error al iniciar sesión. Intentá más tarde.');
        }
      } else if (data.session) {
        onLoginSuccess();
      }
    } catch (err) {
      setError('Error de conexión. Revisá tu internet.');
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
        // Surface the real cause so this is diagnosable from the console/network tab.
        console.error('[resetPasswordForEmail] error:', { status: error.status, code: error.code, message: error.message });
        const status = error.status;
        const msg = (error.message || '').toLowerCase();
        if (status === 429 || msg.includes('rate limit') || msg.includes('rate_limit')) {
          setError('Demasiados intentos por ahora. Esperá unos minutos y volvé a intentar.');
        } else if (msg.includes('smtp') || msg.includes('sending') || msg.includes('send email') || msg.includes('error sending')) {
          setError('No pudimos enviar el correo en este momento. Intentá más tarde o escribinos.');
        } else {
          setError('Error al enviar el correo de recuperación.');
        }
      } else {
        toast.success('Te enviamos un correo con un link. Revisá tu bandeja de entrada (y spam).', { duration: 6000 });
        switchView(false); // volver al login
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  const emailField = (id: string) => (
    <label className="nl-field" htmlFor={id}>
      <span className="nl-field__icon"><IoMailOutline size={18} /></span>
      <input
        id={id}
        type="email"
        className="nl-field__input"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError('');
        }}
        autoComplete="email"
        required
      />
    </label>
  );

  const errorBox = error ? (
    <p className="nl-error" role="alert">{error}</p>
  ) : null;

  return (
    <div className="nl-page">
      <Link href="/" className="nl-back" aria-label="Volver al inicio">
        <IoArrowBack size={16} aria-hidden="true" />
        <span>Volver al inicio</span>
      </Link>

      <div className={`nl ${isForgotView ? 'nl--recover' : ''}`}>
        {/* ── Panel de formularios ───────────────────────────── */}
        <section className="nl__panel nl__panel--form">
          <div className="nl__brand-mobile" aria-hidden="true">HOME</div>

          {notice && !isForgotView && (
            <p className={`nl-notice nl-notice--${notice.tone}`} role="status">{notice.text}</p>
          )}

          {/* Iniciar sesión */}
          <div className="nl__view nl__view--login" aria-hidden={isForgotView}>
            <span className="nl-eyebrow">Acceso</span>
            <h1 className="nl-title">Ingresá al Campus</h1>

            <button type="button" onClick={handleGoogleLogin} className="nl-google" tabIndex={isForgotView ? -1 : 0}>
              <FcGoogle size={20} aria-hidden="true" />
              Continuar con Google
            </button>
            <p className="nl-or"><span>o con tu correo</span></p>

            <form onSubmit={handleLoginSubmit} className="nl-form" noValidate={false}>
              {emailField('nl-email')}

              <label className="nl-field" htmlFor="nl-password">
                <span className="nl-field__icon"><IoLockClosedOutline size={18} /></span>
                <input
                  id="nl-password"
                  type={showPassword ? 'text' : 'password'}
                  className="nl-field__input"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="nl-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
                </button>
              </label>

              {!isForgotView && errorBox}

              <button type="button" className="nl-link" onClick={() => switchView(true)}>
                ¿Olvidaste tu contraseña?
              </button>

              <button type="submit" className="nl-btn" disabled={isLoading}>
                {isLoading ? <span className="nl-spinner" aria-label="Ingresando" /> : 'Iniciar sesión'}
              </button>
            </form>
          </div>

          {/* Recuperar contraseña */}
          <div className="nl__view nl__view--recover" aria-hidden={!isForgotView}>
            <span className="nl-eyebrow">Recuperación</span>
            <h2 className="nl-title">Recuperá tu contraseña</h2>
            <p className="nl-lead">
              Ingresá el correo de tu cuenta y te enviamos un link para crear una contraseña nueva.
            </p>

            <form onSubmit={handleResetPassword} className="nl-form">
              {emailField('nl-email-recover')}
              {isForgotView && errorBox}
              <button type="submit" className="nl-btn" disabled={isLoading} tabIndex={isForgotView ? 0 : -1}>
                {isLoading ? <span className="nl-spinner" aria-label="Enviando" /> : 'Enviar enlace'}
              </button>
            </form>
          </div>
        </section>

        {/* ── Panel de marca (se cruza con el de formularios) ── */}
        <aside className="nl__panel nl__panel--brand">
          <span className="nl__circle nl__circle--a" aria-hidden="true" />
          <span className="nl__circle nl__circle--b" aria-hidden="true" />

          <div className="nl__brand-copy nl__brand-copy--login" aria-hidden={isForgotView}>
            <span className="nl-logo">HOME</span>
            <h2>Tu camino sigue acá</h2>
            <p>Tus clases, tu comunidad y tu avance, en un solo lugar.</p>
            <Link href="/auth/register" className="nl-btn nl-btn--ghost" tabIndex={isForgotView ? -1 : 0}>
              Quiero inscribirme
            </Link>
          </div>

          <div className="nl__brand-copy nl__brand-copy--recover" aria-hidden={!isForgotView}>
            <span className="nl-logo">HOME</span>
            <h2>¿Ya te acordaste?</h2>
            <p>Volvé al inicio de sesión con tu cuenta de siempre.</p>
            <button
              type="button"
              className="nl-btn nl-btn--ghost"
              onClick={() => switchView(false)}
              tabIndex={isForgotView ? 0 : -1}
            >
              Iniciar sesión
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Login;
