'use client'

import React from 'react'
import { AuthProvider } from '@/src/contexts/AuthContext'

/**
 * Thin 'use client' wrapper around the existing AuthProvider.
 * Next.js Server Components cannot directly render context providers that
 * use React hooks. This wrapper marks the boundary where the client JS bundle starts.
 */
export function AuthProviderClient({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
