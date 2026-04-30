'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Login from '@/src/features/auth/Login'
import { supabase } from '@/src/services/supabaseClient'

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)
  const passwordSet  = searchParams.get('message') === 'password_set'

  const checkRoleAndRedirect = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (data && ['admin', 'sysadmin', 'super_admin'].includes(data.role)) {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      console.error("Error checking role:", err);
      router.replace('/dashboard'); // fallback a estudiante
    }
  }

  useEffect(() => {
    // Si ya hay sesión activa, saltar el login y redirigir según rol
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkRoleAndRedirect(session.user.id);
      } else {
        setChecking(false)
      }
    })
  }, [router])

  // Mostrar pantalla de carga mientras verificamos la sesión
  if (checking) {
    return (
      <div className="w-full max-w-md mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
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
    <div className="w-full max-w-md mx-auto">
      {passwordSet && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium px-4 py-3 rounded-lg text-center">
          ¡Contraseña creada! Ya podés iniciar sesión.
        </div>
      )}
      <Login
        onLoginSuccess={handleLoginSuccess}
        onBack={() => router.push('/')}
      />
    </div>
  )
}
