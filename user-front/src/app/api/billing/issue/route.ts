import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const SUBSCRIPTION_AMOUNT = 33000

function tossAuthHeader() {
  // 빌링 API는 'API 개별 연동' 시크릿 키 사용(결제위젯 시크릿과 별도)
  const secret = process.env.TOSS_BILLING_SECRET_KEY
  if (!secret) throw new Error('TOSS_BILLING_SECRET_KEY(API 개별 연동 시크릿)가 설정되지 않았습니다.')
  return `Basic ${Buffer.from(`${secret}:`).toString('base64')}`
}

// 빌링 인증 성공(authKey) → billingKey 발급 → 구독 저장.
// mode 'new': 첫 달 즉시 청구 + active 구독 생성. mode 'change': 기존 active의 billing_key만 교체(청구 없음).
export async function POST(request: Request) {
  try {
    const { authKey, customerKey, mode = 'new' } = await request.json()
    if (!authKey || !customerKey) {
      return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })
    }

    // 세션 유저 == customerKey 검증
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== customerKey) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const auth = tossAuthHeader()

    // 1) authKey → billingKey
    const issueRes = await fetch(`https://api.tosspayments.com/v1/billing/authorizations/${authKey}`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerKey }),
    })
    const issueData = await issueRes.json()
    if (!issueRes.ok) {
      return NextResponse.json({ error: '빌링키 발급 실패', details: issueData }, { status: 400 })
    }
    const billingKey = issueData.billingKey as string

    // 결제수단 변경: 기존 active 구독의 billing_key만 교체(청구 X)
    if (mode === 'change') {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({ billing_key: billingKey, updated_at: new Date().toISOString() })
        .eq('user_id', customerKey)
        .eq('status', 'active')
      if (error) return NextResponse.json({ error: '결제수단 변경 실패', details: error.message }, { status: 500 })
      return NextResponse.json({ success: true, changed: true })
    }

    // 신규 구독: 첫 달 즉시 청구
    const orderId = `SUB_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const chargeRes = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerKey,
        amount: SUBSCRIPTION_AMOUNT,
        orderId,
        orderName: '월간 구독',
        customerEmail: user.email ?? undefined,
      }),
    })
    const chargeData = await chargeRes.json()
    if (!chargeRes.ok) {
      return NextResponse.json({ error: '첫 결제 실패', details: chargeData }, { status: 400 })
    }

    // 기존 active 정리 후 신규 active 생성 (다음 청구일 = +1개월)
    const now = new Date()
    const next = new Date(now)
    next.setMonth(next.getMonth() + 1)
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'canceled', canceled_at: now.toISOString() })
      .eq('user_id', customerKey)
      .eq('status', 'active')

    const { error: insErr } = await supabaseAdmin.from('subscriptions').insert({
      user_id: customerKey,
      billing_key: billingKey,
      customer_key: customerKey,
      status: 'active',
      amount: SUBSCRIPTION_AMOUNT,
      started_at: now.toISOString(),
      next_billing_date: next.toISOString(),
      last_charged_at: now.toISOString(),
    })
    if (insErr) return NextResponse.json({ error: '구독 저장 실패', details: insErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error', message: (e as Error).message }, { status: 500 })
  }
}
