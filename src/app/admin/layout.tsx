import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { resolveRole, isAdminRole } from '@/src/services/roleService'

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
    <div className="animate-pulse">Loading Admin...</div>
  </div>
)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const role = await resolveRole(supabase, user.id)
  
  if (!isAdminRole(role)) {
    redirect('/dashboard')
  }

  return (
    <div className="relative font-sans text-slate-900 antialiased bg-slate-50 min-h-screen">
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </div>
  )
}
