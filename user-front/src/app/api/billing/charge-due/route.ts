import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// 정기 청구 — Vercel Cron이 매일 호출. next_billing_date 지난 active 구독을 billing_key로 청구하고 +1개월 갱신.
// 보호: Authorization: Bearer ${CRON_SECRET}.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secret = process.env.TOSS_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'TOSS_SECRET_KEY 없음' }, { status: 500 })
  const auth = `Basic ${Buffer.from(`${secret}:`).toString('base64')}`

  const nowIso = new Date().toISOString()
  const { data: due, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .lte('next_billing_date', nowIso)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { id: number; ok: boolean }[] = []
  for (const sub of due ?? []) {
    try {
      const orderId = `SUB_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const res = await fetch(`https://api.tosspayments.com/v1/billing/${sub.billing_key}`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerKey: sub.customer_key,
          amount: sub.amount,
          orderId,
          orderName: '월간 구독',
        }),
      })
      if (res.ok) {
        const next = new Date(sub.next_billing_date)
        next.setMonth(next.getMonth() + 1)
        await supabaseAdmin
          .from('subscriptions')
          .update({ next_billing_date: next.toISOString(), last_charged_at: nowIso, updated_at: nowIso })
          .eq('id', sub.id)
        results.push({ id: sub.id, ok: true })
      } else {
        // 청구 실패 → past_due (재시도/해지 정책은 추후)
        await supabaseAdmin.from('subscriptions').update({ status: 'past_due', updated_at: nowIso }).eq('id', sub.id)
        results.push({ id: sub.id, ok: false })
      }
    } catch {
      results.push({ id: sub.id, ok: false })
    }
  }

  return NextResponse.json({ charged: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length })
}
