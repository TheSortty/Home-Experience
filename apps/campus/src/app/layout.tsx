import React from 'react'
import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Fraunces — variable serif for headings. Misma fuente que el sitio
// principal para que la marca no se sienta distinta al cruzar de dominio.
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes: ['SOFT', 'opsz'],
})

export const metadata: Metadata = {
  title: 'Mi Campus | HOME Experience',
  description: 'Espacio de alumno para programas de HOME Experience.',
}

/**
 * Root layout del Worker de campus.
 *
 * A diferencia del root layout de marketing, acá NO va AuthProviderClient
 * (el contexto de auth de React) ni CookieConsent: ninguna pantalla de
 * (campus) los usa — la sesión y el rol se resuelven server-side en cada
 * layout/page vía createClient().auth.getUser(), no con el context de React.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased text-slate-900 bg-white">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#fff',
              borderRadius: '12px',
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}
