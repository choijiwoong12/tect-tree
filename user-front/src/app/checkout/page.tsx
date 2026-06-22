'use client'

import { useEffect, useRef, useState } from 'react'
import { loadPaymentWidget, PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk'
import { createTestOrder } from './actions'

export default function CheckoutPage() {
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null)
  const paymentMethodsWidgetRef = useRef<ReturnType<PaymentWidgetInstance['renderPaymentMethods']> | null>(null)
  const [price, setPrice] = useState(5000)
  const [loading, setLoading] = useState(false)
  const [orderInfo, setOrderInfo] = useState<any>(null)
  const [error, setError] = useState('')

  const isWidgetLoaded = useRef(false)

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY

    if (!clientKey) {
      setError('Toss client key is missing')
      return
    }

    if (isWidgetLoaded.current) return
    isWidgetLoaded.current = true

    const loadWidget = async () => {
      try {
        // We generate a random customer key or use the user's ID
        const customerKey = Math.random().toString(36).substring(2, 11)
        const paymentWidget = await loadPaymentWidget(clientKey, customerKey)
        
        const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
          '#payment-widget',
          { value: price }
        )
        
        paymentWidget.renderAgreement(
          '#agreement'
        )

        paymentWidgetRef.current = paymentWidget
        paymentMethodsWidgetRef.current = paymentMethodsWidget
      } catch (err: any) {
        setError('결제 위젯을 불러오는데 실패했습니다: ' + err.message)
      }
    }

    loadWidget()
  }, [])

  useEffect(() => {
    const paymentMethodsWidget = paymentMethodsWidgetRef.current
    if (paymentMethodsWidget) {
      paymentMethodsWidget.updateAmount(price)
    }
  }, [price])

  const handlePayment = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Create a pending order in the database via server action
      const order = await createTestOrder()
      setOrderInfo(order)

      // 2. Request payment via Toss Widget
      const paymentWidget = paymentWidgetRef.current
      if (!paymentWidget) {
        throw new Error('결제 위젯이 초기화되지 않았습니다.')
      }

      await paymentWidget.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
      })
    } catch (err: any) {
      setError(err.message || '결제 요청 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1>테스트 상품 결제</h1>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      
      {/* Toss Payment Widget UI */}
      <div id="payment-widget" style={{ width: '100%' }} />
      <div id="agreement" style={{ width: '100%' }} />
      
      <button 
        onClick={handlePayment} 
        disabled={loading}
        style={{
          width: '100%',
          padding: '1rem',
          backgroundColor: '#3182f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1.2rem',
          cursor: 'pointer',
          marginTop: '1rem'
        }}
      >
        {loading ? '결제 준비 중...' : `${price.toLocaleString()}원 결제하기`}
      </button>
    </main>
  )
}
