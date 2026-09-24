import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// 빌링 인증 콜백(서버) — Toss가 카드 등록 성공 시 이 GET으로 리다이렉트.
// authKey → billingKey 발급 → (new) 첫 달 청구 + 구독 생성 / (change) 빌링키 교체 → '/'로 리다이렉트.
// 클라 fetch 없이 서버에서 처리(콜백 정석) → 풀 리로드라 AuthProvider가 구독 상태 새로 읽음.
const SUBSCRIPTION_AMOUNT = 33000
const TAG = '[billing/callback]'

function tossAuthHeader() {
  const secret = process.env.TOSS_BILLING_SECRET_KEY
  if (!secret) throw new Error('TOSS_BILLING_SECRET_KEY(API 개별 연동 시크릿)가 설정되지 않았습니다.')
  return `Basic ${Buffer.from(`${secret}:`).toString('base64')}`
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const fail = (msg: string) =>
    NextResponse.redirect(new URL(`/billing/fail?message=${encodeURIComponent(msg)}`, url.origin))

  try {
    const authKey = url.searchParams.get('authKey')
    const customerKey = url.searchParams.get('customerKey')
    const mode = url.searchParams.get('mode') || 'new'
    console.log(TAG, 'start mode=%s customerKey=%s authKey=%s', mode, String(customerKey).slice(0, 8), String(authKey).slice(0, 8))
    if (!authKey || !customerKey) return fail('인증 정보 누락')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== customerKey) {
      console.error(TAG, 'auth mismatch session=%s customer=%s', user?.id?.slice(0, 8) ?? 'none', String(customerKey).slice(0, 8))
      return fail('세션/사용자 불일치')
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
      console.error(TAG, 'billingKey 발급 실패', issueRes.status, issueData)
      return fail(`빌링키 발급 실패: ${issueData.message ?? issueData.code ?? ''}`)
    }
    const billingKey = issueData.billingKey as string
    console.log(TAG, 'billingKey 발급 OK')

    const nowIso = new Date().toISOString()

    // 결제수단 변경: 기존 active의 billing_key만 교체(청구 X)
    if (mode === 'change') {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({ billing_key: billingKey, updated_at: nowIso })
        .eq('user_id', customerKey)
        .eq('status', 'active')
      if (error) {
        console.error(TAG, 'change 실패', error.message)
        return fail(`결제수단 변경 실패: ${error.message}`)
      }
      return NextResponse.redirect(new URL('/', url.origin))
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
      console.error(TAG, '첫 결제 실패', chargeRes.status, chargeData)
      return fail(`첫 결제 실패: ${chargeData.message ?? chargeData.code ?? ''}`)
    }
    console.log(TAG, '첫 결제 OK')

    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'canceled', canceled_at: nowIso })
      .eq('user_id', customerKey)
      .eq('status', 'active')

    const { error: insErr } = await supabaseAdmin.from('subscriptions').insert({
      user_id: customerKey,
      billing_key: billingKey,
      customer_key: customerKey,
      status: 'active',
      amount: SUBSCRIPTION_AMOUNT,
      started_at: nowIso,
      next_billing_date: next.toISOString(),
      last_charged_at: nowIso,
    })
    if (insErr) {
      console.error(TAG, '구독 insert 실패', insErr.message)
      return fail(`구독 저장 실패: ${insErr.message}`)
    }

    console.log(TAG, 'DONE — subscription created')
    return NextResponse.redirect(new URL('/', url.origin))
  } catch (e) {
    console.error(TAG, 'exception', (e as Error).message)
    return fail((e as Error).message)
  }
}
