'use client'
import React, { Suspense } from 'react'
import Loading from '../loading'
import { useRouter } from 'next/navigation'
import Header from '@/src/ui/Header'
import Footer from '@/src/ui/Footer'
import InteractiveBg from '@/src/features/landing/InteractiveBg'
import { SmoothScroll } from '@/src/components/SmoothScroll'


export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleLoginClick = () => router.push('/auth/login')
  const handleStartClick = () => router.push('/?select=true')

  return (
    <>
      <SmoothScroll />
      <div className="relative font-sans text-slate-900 antialiased bg-transparent selection:bg-blue-100 selection:text-blue-900">
        <InteractiveBg />

        <div className="fixed top-0 left-0 right-0 z-[9999] flex flex-col">
          <Header onLoginClick={handleLoginClick} onStartClick={handleStartClick} />
        </div>

        <Suspense fallback={<Loading />}>
          <main>{children}</main>
        </Suspense>

        <div className="bg-white pt-20">
          <Footer onEasterEggClick={() => {}} />
        </div>
      </div>
    </>
  )
}
