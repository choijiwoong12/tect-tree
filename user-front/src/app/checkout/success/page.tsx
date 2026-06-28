'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setError('결제 인증 정보가 올바르지 않습니다.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('인증 세션이 만료되었습니다. 다시 로그인해주세요.')

        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount), userId: user.id }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || errData.message || '결제 승인에 실패했습니다.')
        }

        await refreshUser()
        // 성공 → 별도 완료 화면 없이 인트로(메인)로.
        if (!cancelled) router.replace('/')
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, refreshUser, router])

  if (error) {
    return (
      <main className="mx-auto max-w-[600px] px-6 py-10 text-center text-white">
        <h1 className="mb-2 text-lg text-red-400">결제 실패</h1>
        <p className="mb-6 text-sm text-white/70">{error}</p>
        <button onClick={() => router.replace('/')} className="rounded bg-white/10 px-5 py-2 text-sm">
          홈으로
        </button>
      </main>
    )
  }

  return <main className="px-6 py-10 text-center text-sm text-white/60">결제 확인 중입니다...</main>
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="px-6 py-10 text-center text-sm text-white/60">로딩 중...</main>}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
