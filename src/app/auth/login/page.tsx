'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Login from '@/src/features/auth/Login'

export default function LoginPage() {
  const router = useRouter()

  return (
    <div className="w-full max-w-md mx-auto">
      <Login
        onLoginSuccess={() => router.push('/admin/dashboard')}
        onBack={() => router.push('/')}
      />
    </div>
  )
}
