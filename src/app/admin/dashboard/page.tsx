'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboard from '@/src/features/dashboard/AdminDashboard'

export default function AdminDashboardPage() {
  const router = useRouter()

  return (
    <AdminDashboard
      onLogout={() => router.push('/')}
      onRegisterTest={() => router.push('/auth/register')}
    />
  )
}
