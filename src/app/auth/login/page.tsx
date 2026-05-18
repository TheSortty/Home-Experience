'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Login from '@/src/features/auth/Login'
import { supabase } from '@/src/services/supabaseClient'
import { resolveRole, isAdminRole } from '@/src/services/roleService'

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)
  const passwordSet    = searchParams.get('message') === 'password_set'
  const invalidToken   = searchParams.get('error') === 'InvalidToken'

  const checkRoleAndRedirect = async (userId: string) => {
    const role = await resolveRole(supabase, userId);
    if (isAdminRole(role)) {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/dashboard');
    }
  }

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          checkRoleAndRedirect(session.user.id);
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router])

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
      router.push('/dashboard');
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
