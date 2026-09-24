'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function CheckoutFailContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const message = searchParams.get('message')

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ color: 'red' }}>결제 실패</h1>
      <div style={{ margin: '2rem 0', padding: '1rem', background: '#ffebee', borderRadius: '8px' }}>
        <p><strong>에러 코드:</strong> {code}</p>
        <p><strong>사유:</strong> {message}</p>
      </div>

      <Link href="/checkout" style={{ padding: '10px 20px', background: '#3182f6', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
        결제 다시 시도하기
      </Link>
    </main>
  )
}

export default function CheckoutFailPage() {
  return (
    <Suspense fallback={<main style={{ textAlign: 'center', padding: '2rem' }}><p>로딩 중...</p></main>}>
      <CheckoutFailContent />
    </Suspense>
  )
}
