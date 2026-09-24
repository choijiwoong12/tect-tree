import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { paymentKey, orderId, amount, userId } = await request.json()

    if (!paymentKey || !orderId || !amount || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Validate Order in Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_no', orderId)
      .eq('user_id', userId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.amount !== amount) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // 멱등 처리 — 이미 완료된 주문이면 새로고침/중복 confirm에도 성공 응답
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, alreadyPaid: true })
    }
    if (order.status !== 'pending' && order.status !== 'processing') {
      return NextResponse.json({ error: 'Order is not payable' }, { status: 409 })
    }

    // 동시 중복 confirm 방지 — pending → processing CAS. 한 요청만 Toss 승인을 진행한다.
    const { data: claimed } = await supabaseAdmin
      .from('orders')
      .update({ status: 'processing' })
      .eq('id', order.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (!claimed) {
      // 다른 요청이 선점 → 잠깐 대기 후 결과 확인 (StrictMode 이중 호출 등)
      await new Promise((r) => setTimeout(r, 1500))
      const { data: after } = await supabaseAdmin
        .from('orders')
        .select('status')
        .eq('id', order.id)
        .single()
      if (after?.status === 'paid') {
        return NextResponse.json({ success: true, alreadyPaid: true })
      }
      return NextResponse.json({ error: '결제 처리 중입니다. 잠시 후 다시 확인해주세요.' }, { status: 409 })
    }

    // 2. Confirm Payment with Toss API
    const tossSecretKey = process.env.TOSS_SECRET_KEY
    if (!tossSecretKey) {
      throw new Error('TOSS_SECRET_KEY is not configured')
    }
    const encodedKey = Buffer.from(`${tossSecretKey}:`).toString('base64')

    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    })

    if (!tossRes.ok) {
      const errorData = await tossRes.json()
      // 승인 실패 → 주문을 다시 pending으로 되돌려 재시도 가능하게 + 실패 기록
      await supabaseAdmin.from('orders').update({ status: 'pending' }).eq('id', order.id)
      await supabaseAdmin.from('payments').insert({
        user_id: userId,
        order_row_id: order.id,
        provider: 'toss',
        order_id: orderId,
        toss_payment_key: paymentKey,
        provider_payment_id: paymentKey,
        amount: order.amount,
        rp_amount: order.rp_amount,
        status: 'failed',
        failed_reason: errorData?.message?.substring(0, 255) || 'Toss payment failed',
      })
      
      return NextResponse.json(
        { error: 'Toss payment failed', details: errorData },
        { status: 400 }
      )
    }

    const tossPayload = await tossRes.json()

    // 3. Update Supabase (Success)
    // Note: In a production environment, this should ideally be an RPC call for atomicity.
    
    // Insert Payment
    const { data: payment } = await supabaseAdmin.from('payments').insert({
      user_id: userId,
      order_row_id: order.id,
      provider: 'toss',
      order_id: orderId,
      toss_payment_key: paymentKey,
      provider_payment_id: paymentKey,
      amount: order.amount,
      rp_amount: order.rp_amount,
      status: 'paid',
      paid_at: new Date().toISOString(),
      raw_payload: tossPayload,
    }).select().single()

    // Update Order Status
    await supabaseAdmin.from('orders').update({ status: 'paid' }).eq('id', order.id)

    // Get Current User Balance
    const { data: user } = await supabaseAdmin.from('users').select('rp_balance').eq('id', userId).single()
    const currentBalance = user?.rp_balance || 0
    const newBalance = currentBalance + order.rp_amount

    // Insert RP Transaction
    await supabaseAdmin.from('rp_transactions').insert({
      user_id: userId,
      delta: order.rp_amount,
      balance_after: newBalance,
      kind: 'charge',
      reference_id: order.order_no,
      source_type: 'payment',
      source_id: payment?.id?.toString(),
      idempotency_key: `payment:${paymentKey}`,
      memo: '토스 결제 RP 충전',
    })

    // Update User Balance
    await supabaseAdmin.from('users').update({ rp_balance: newBalance }).eq('id', userId)

    return NextResponse.json({ success: true, payment })

  } catch (error: any) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
  }
}
