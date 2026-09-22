'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Login from '@/src/features/auth/Login'
import { supabase } from '@home/services/supabaseClient'
import { resolveRole, isAdminRole } from '@home/services/roleService'
import { CAMPUS_URL, safeNextUrl } from '@home/services/siteUrls'

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  // No on-mount "already logged in?" check here — the middleware already
  // redirects authenticated users away from /auth/login server-side, using
  // getUser() (validated against the Supabase Auth server). Duplicating that
  // check here with getSession() (which trusts a possibly-stale local
  // session) caused a redirect loop: middleware bounces an invalid session
  // back to /auth/login, this page's client-side check optimistically sends
  // it to /admin/dashboard, middleware bounces it back again.
  const [checking, setChecking] = useState(false)
  const passwordSet    = searchParams.get('message') === 'password_set'
  const invalidToken   = searchParams.get('error') === 'InvalidToken'

  // A dónde iba el usuario antes de que lo mandaran a loguearse. El campus
  // lo manda como URL absoluta (?next=http://campus.../cursos/abc) porque
  // vive en otro dominio; safeNextUrl() se encarga de que sólo se acepten
  // destinos de nuestros dos orígenes.
  const nextParam = searchParams.get('next')

  const goToCampus = () => {
    // El campus vive en otro Worker/dominio — no es una ruta interna que
    // router.replace pueda resolver, hace falta una navegación dura.
    window.location.href = safeNextUrl(nextParam, `${CAMPUS_URL}/dashboard`);
  }

  const checkRoleAndRedirect = async (userId: string) => {
    const role = await resolveRole(supabase, userId);
    if (isAdminRole(role)) {
      // Un admin con ?next= al campus igual va al campus: entró por un link
      // concreto, no a administrar.
      const dest = safeNextUrl(nextParam, '/admin/dashboard');
      if (dest.startsWith('/')) router.replace(dest);
      else window.location.href = dest;
    } else {
      goToCampus();
    }
  }

  const BackButton = (
    <Link href="/" aria-label="Volver al inicio" className="auth-back">
      <span className="auth-back__pulse" aria-hidden="true" />
      <span className="auth-back__arrow" aria-hidden="true">
        <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.5 2.5L4 7l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span>Volver</span>
      <span className="auth-back__divider" aria-hidden="true" />
      <span className="auth-back__label-extended">al inicio</span>
    </Link>
  )

  // Mostrar pantalla de carga mientras verificamos la sesión
  if (checking) {
    return (
      <>
        {BackButton}
        <div className="w-full max-w-md mx-auto flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </>
    )
  }

  const handleLoginSuccess = async () => {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      checkRoleAndRedirect(session.user.id);
    } else {
      goToCampus();
    }
  }

  return (
    <>
      {BackButton}
      <div className="w-full max-w-md mx-auto">
        {passwordSet && (
          <div className="mb-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium px-4 py-3 rounded-lg text-center">
            ¡Contraseña creada! Ya podés iniciar sesión.
          </div>
        )}
        {invalidToken && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-lg text-center">
            El enlace expiró o ya fue utilizado. Solicitá uno nuevo desde "¿Olvidaste tu contraseña?".
          </div>
        )}
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    </>
  )
}
