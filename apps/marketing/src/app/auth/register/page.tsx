'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import RegistrationForm from '@/src/features/auth/RegistrationForm'

export default function RegisterPage() {
  const router = useRouter()

  return (
    <RegistrationForm
      onSubmitSuccess={() => router.push('/')}
      onBack={() => router.push('/')}
    />
  )
}
