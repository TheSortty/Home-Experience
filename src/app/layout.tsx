import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProviderClient } from './_components/AuthProviderClient'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
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
    <html lang="es" className={`${inter.variable}`}>
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
        </AuthProviderClient>
      </body>
    </html>
  )
}
