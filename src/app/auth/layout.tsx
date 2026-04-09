'use client'

import React, { Suspense } from 'react'
import InteractiveBg from '@/src/features/landing/InteractiveBg'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative font-sans text-slate-900 antialiased bg-slate-50 selection:bg-blue-100 selection:text-blue-900 min-h-screen flex items-center justify-center p-4">
      <InteractiveBg />
      <Suspense fallback={null}>
        <main className="w-full relative z-10">{children}</main>
      </Suspense>
    </div>
  )
}
