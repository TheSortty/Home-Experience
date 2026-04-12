'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Login from '@/src/features/auth/Login'
import { supabase } from '@/src/services/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Si ya hay sesión activa, saltar el login y ir directo al dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/admin/dashboard')
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

  return (
    <div className="w-full max-w-md mx-auto">
      <Login
        onLoginSuccess={() => router.push('/admin/dashboard')}
        onBack={() => router.push('/')}
      />
    </div>
  )
}
