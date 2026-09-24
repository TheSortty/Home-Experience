'use client'

import React, { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import '@/src/features/auth/LoginNeu.css'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // El login tiene su propio look (neumórfico, claro) y se pinta a pantalla
  // completa; el resto de /auth/* (registro, nueva contraseña) mantiene el
  // fondo oscuro con aurora.
  if (pathname?.startsWith('/auth/login')) {
    return (
      <div className="nl-shell font-sans antialiased">
        <Suspense fallback={null}>
          <main>{children}</main>
        </Suspense>
      </div>
    )
  }

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
