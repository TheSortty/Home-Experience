import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@home/services/supabase/server'
import { resolveRole, isReviewerRole } from '@home/services/roleService'
import { CAMPUS_URL } from '@home/services/siteUrls'

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
    <div className="animate-pulse">Loading Admin...</div>
  </div>
)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const user = await getSessionUser(supabase)

  if (!user) redirect('/auth/login')

  const role = await resolveRole(supabase, user.id)

  // Admin section is reachable by admins, sysadmins and coaches.
  // Coaches are bounced from admin-only pages at the page level.
  if (!isReviewerRole(role)) {
    redirect(`${CAMPUS_URL}/dashboard`)
  }

  return (
    <div className="relative font-sans text-slate-900 antialiased bg-slate-50 min-h-screen">
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </div>
  )
}
