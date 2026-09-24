'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk'
import { RP_PACKAGES, SUBSCRIPTION_PRICE } from '@/content/shop'
import { createOrder, type OrderInput } from './actions'

// SHOP 모달의 ( > )(결제) → 이 페이지로 이동. kind=rp&rp=5000.
// 결제위젯(gck 키)은 신규 SDK(tosspayments-sdk)의 widgets()로 띄운다. 금액·RP 지급은 서버에서 확정.
function resolveProduct(kind: string | null, rp: number): OrderInput | null {
  if (kind === 'subscription') {
    return { code: 'SUBSCRIPTION_MONTHLY', name: '월간 구독', price: SUBSCRIPTION_PRICE, rpAmount: 0 }
  }
  if (kind === 'rp') {
    const pkg = RP_PACKAGES.find((p) => p.rp === rp)
    if (!pkg) return null
    return {
      code: `RP_${pkg.rp}`,
      name: `${pkg.rp.toLocaleString()} RP 충전`,
      price: pkg.price,
      rpAmount: pkg.rp + (pkg.bonus ?? 0),
    }
  }
  return null
}

type Widgets = ReturnType<Awaited<ReturnType<typeof loadTossPayments>>['widgets']>

function CheckoutContent() {
  const searchParams = useSearchParams()
  const product = useMemo(
    () => resolveProduct(searchParams.get('kind'), Number(searchParams.get('rp') || 0)),
    [searchParams],
  )

  const widgetsRef = useRef<Widgets | null>(null)
  const initRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!product) {
      setError('상품 정보가 올바르지 않습니다.')
      return
    }
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
    if (!clientKey) {
      setError('Toss 클라이언트 키가 설정되지 않았습니다.')
      return
    }
    if (initRef.current) return
    initRef.current = true

    ;(async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey)
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS })
        await widgets.setAmount({ currency: 'KRW', value: product.price })
        await Promise.all([
          widgets.renderPaymentMethods({ selector: '#payment-widget' }),
          widgets.renderAgreement({ selector: '#agreement' }),
        ])
        widgetsRef.current = widgets
        setReady(true)
      } catch (err) {
        setError('결제 위젯을 불러오지 못했습니다: ' + (err as Error).message)
      }
    })()
  }, [product])

  async function handlePayment() {
    if (!product) return
    const widgets = widgetsRef.current
    if (!widgets) {
      setError('결제 위젯이 아직 준비되지 않았습니다.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const order = await createOrder(product)
      await widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        customerName: order.customerName,
        customerEmail: order.customerEmail ?? undefined,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
      })
    } catch (err) {
      setError((err as Error).message || '결제 요청 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-[600px] px-6 py-10 text-white">
      <h1 className="mb-2 font-pixel text-2xl">CHECKOUT</h1>
      <p className="mb-6 text-sm text-white/60">
        {product ? `${product.name} · ${product.price.toLocaleString()} KRW` : '상품 정보 없음'}
      </p>

      {error && <div className="mb-4 rounded bg-red-500/15 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div id="payment-widget" className="w-full" />
      <div id="agreement" className="w-full" />

      <button
        onClick={handlePayment}
        disabled={loading || !ready || !product}
        className="mt-4 w-full rounded-lg bg-[#3182f6] py-4 text-lg text-white disabled:opacity-50"
      >
        {loading ? '결제 준비 중...' : !ready ? '결제 위젯 불러오는 중...' : product ? `${product.price.toLocaleString()}원 결제하기` : '상품 없음'}
      </button>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="px-6 py-10 text-center text-white/60">로딩 중...</main>}>
      <CheckoutContent />
    </Suspense>
  )
}
