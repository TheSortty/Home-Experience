import React from 'react'
import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProviderClient } from './_components/AuthProviderClient'
import CookieConsent from '@/src/components/CookieConsent'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Fraunces — variable serif for headings. Editorial warmth without feeling
// corporate; pairs cleanly with Inter for body. Loaded as a CSS variable so
// Tailwind's font-serif resolves to it everywhere.
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes: ['SOFT', 'opsz'],
})

export const metadata: Metadata = {
  title: 'HOME Experience',
  description: 'Procesos de transformación personal',
}

/**
 * Root layout for the Next.js App Router.
 * - Imports global CSS (mirrors src/index.css).
 * - Wraps all pages in AuthProviderClient so useAuth() works throughout the tree.
 * - Includes the global Toaster notification system.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased text-slate-900 bg-white">
        <AuthProviderClient>
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
          <CookieConsent />
        </AuthProviderClient>
      </body>
    </html>
  )
}
