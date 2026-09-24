'use client'

import React, { useState } from 'react'
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

  // Mientras verificamos la sesión mostramos sólo un spinner
  if (checking) {
    return (
      <div className="w-full flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-[#00A9CE] rounded-full animate-spin" />
      </div>
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

  const notice = passwordSet
    ? { tone: 'success' as const, text: '¡Contraseña creada! Ya podés iniciar sesión.' }
    : invalidToken
      ? { tone: 'error' as const, text: 'El enlace expiró o ya fue utilizado. Solicitá uno nuevo desde "¿Olvidaste tu contraseña?".' }
      : null

  return <Login onLoginSuccess={handleLoginSuccess} notice={notice} />
}
