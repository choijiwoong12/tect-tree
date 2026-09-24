import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// 구독 해지 — 다음 청구 중단(status=canceled). 혜택은 next_billing_date까지 유지(여기선 날짜 그대로 둠).
export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'active')
    if (error) return NextResponse.json({ error: '구독 해지 실패', details: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error', message: (e as Error).message }, { status: 500 })
  }
}
