'use client'

import React, { Suspense } from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell relative font-sans antialiased min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Base mesh background */}
      <div aria-hidden="true" className="auth-shell__mesh" />
      {/* Animated aurora blobs */}
      <div aria-hidden="true" className="auth-shell__aurora auth-shell__aurora--a" />
      <div aria-hidden="true" className="auth-shell__aurora auth-shell__aurora--b" />
      <div aria-hidden="true" className="auth-shell__aurora auth-shell__aurora--c" />
      {/* Grid pattern overlay */}
      <div aria-hidden="true" className="auth-shell__grid" />
      {/* Grain texture */}
      <div aria-hidden="true" className="auth-shell__grain" />
      {/* Top/Bottom edge vignette */}
      <div aria-hidden="true" className="auth-shell__vignette" />

      <Suspense fallback={null}>
        <main className="w-full relative z-10">{children}</main>
      </Suspense>
    </div>
  )
}
