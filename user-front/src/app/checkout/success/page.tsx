'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setErrorMessage('결제 인증 정보가 올바르지 않습니다.')
      return
    }

    const confirmPayment = async () => {
      try {
        // Since we need userId, wait, our Next.js API Route for confirm expects `userId`!
        // But how do we get userId? We should fetch the current user's session first!
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('인증 세션이 만료되었습니다. 다시 로그인해주세요.')
        }

        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
            userId: user.id
          })
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || errData.message || '결제 승인에 실패했습니다.')
        }

        // Pull the freshly-credited RP balance into the app state.
        await refreshUser()
        setStatus('success')
      } catch (err: any) {
        setStatus('error')
        setErrorMessage(err.message)
      }
    }

    confirmPayment()
  }, [searchParams, refreshUser])

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      {status === 'loading' && (
        <>
          <h1>결제 승인 중입니다...</h1>
          <p>창을 닫거나 새로고침하지 마세요.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <h1 style={{ color: 'green' }}>결제가 완료되었습니다! 🎉</h1>
          <p>주문번호: {searchParams.get('orderId')}</p>
          <div style={{ marginTop: '2rem' }}>
            <Link href="/" style={{ padding: '10px 20px', background: '#eee', borderRadius: '8px' }}>
              홈으로 가기
            </Link>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <h1 style={{ color: 'red' }}>결제 실패</h1>
          <p>{errorMessage}</p>
          <div style={{ marginTop: '2rem' }}>
            <button onClick={() => router.push('/checkout')} style={{ padding: '10px 20px' }}>
              다시 시도하기
            </button>
          </div>
        </>
      )}
    </main>
  )
}
