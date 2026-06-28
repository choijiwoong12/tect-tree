'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function BillingFailContent() {
  const router = useRouter()
  const sp = useSearchParams()
  const message = sp.get('message')
  return (
    <main className="mx-auto max-w-[600px] px-6 py-10 text-center text-white">
      <h1 className="mb-2 text-lg text-red-400">결제수단 등록 실패</h1>
      <p className="mb-6 text-sm text-white/70">{message || '카드 등록이 취소되었거나 실패했습니다.'}</p>
      <button onClick={() => router.replace('/')} className="rounded bg-white/10 px-5 py-2 text-sm">
        홈으로
      </button>
    </main>
  )
}

export default function BillingFailPage() {
  return (
    <Suspense fallback={<main className="px-6 py-10 text-center text-sm text-white/60">로딩 중...</main>}>
      <BillingFailContent />
    </Suspense>
  )
}
