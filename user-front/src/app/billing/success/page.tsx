'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

// 카드 등록(빌링 인증) 성공 콜백 → /api/billing/issue(빌링키 발급 + 첫 청구/변경) → 인트로로.
function BillingSuccessContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const authKey = sp.get('authKey')
    const customerKey = sp.get('customerKey')
    const mode = sp.get('mode') || 'new'
    if (!authKey || !customerKey) {
      setError('인증 정보가 올바르지 않습니다.')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/billing/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authKey, customerKey, mode }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || '구독 등록에 실패했습니다.')
        }
        await refreshUser() // 구독 상태(subscribedUntil) 즉시 반영
        if (!cancelled) router.replace('/')
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sp, router, refreshUser])

  if (error) {
    return (
      <main className="mx-auto max-w-[600px] px-6 py-10 text-center text-white">
        <h1 className="mb-2 text-lg text-red-400">구독 등록 실패</h1>
        <p className="mb-6 text-sm text-white/70">{error}</p>
        <button onClick={() => router.replace('/')} className="rounded bg-white/10 px-5 py-2 text-sm">
          홈으로
        </button>
      </main>
    )
  }
  return <main className="px-6 py-10 text-center text-sm text-white/60">구독 등록 중입니다...</main>
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<main className="px-6 py-10 text-center text-sm text-white/60">로딩 중...</main>}>
      <BillingSuccessContent />
    </Suspense>
  )
}
