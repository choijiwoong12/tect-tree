import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'
import { isSubscribed } from '@/lib/subscription'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nodeId, method } = await req.json() as { nodeId: number; method: 'rp' | 'subscription' }

  // 이미 해금된 경우
  const { data: existing } = await supabaseAdminDb
    .from('user_node_access')
    .select('id')
    .eq('user_id', user.id)
    .eq('node_id', nodeId)
    .maybeSingle()
  if (existing) return NextResponse.json({ ok: true })

  // 노드 가격 조회
  const { data: node } = await supabaseAdminDb
    .from('document_nodes')
    .select('id, price')
    .eq('id', nodeId)
    .single()
  if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 })

  if (method === 'subscription') {
    // 구독 열람 — 구독 유효 시 접근 가능. 별도 행을 만들지 않음(구독은 잠긴 노드 전체에 동적 접근).
    // 행이 없으므로 구독이 끝나면 자동으로 다시 잠긴다.
    if (!(await isSubscribed(supabase, user.id))) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 402 })
    }
    return NextResponse.json({ ok: true })
  }

  // method === 'rp' — RP 차감 후 영구 접근권(purchase) 부여
  const price = node.price ?? 0
  const { data: userData } = await supabase
    .from('users')
    .select('rp_balance')
    .eq('id', user.id)
    .single()

  if (!userData || userData.rp_balance < price) {
    return NextResponse.json({ error: 'Insufficient RP' }, { status: 402 })
  }

  const { error: rpError } = await supabase
    .from('users')
    .update({ rp_balance: userData.rp_balance - price })
    .eq('id', user.id)
  if (rpError) return NextResponse.json({ error: rpError.message }, { status: 500 })

  // source는 어드민 스키마 CHECK 제약상 'purchase'/'free'/'admin'만 허용 → RP 구매는 'purchase'
  const { error: accessError } = await supabaseAdminDb.from('user_node_access').insert({
    user_id: user.id,
    node_id: nodeId,
    source: 'purchase',
    granted_at: new Date().toISOString(),
  })
  if (accessError) {
    // 접근권 부여 실패 시 차감한 RP 롤백 (열람 불가 상태로 RP만 빠지는 것 방지)
    await supabase.from('users').update({ rp_balance: userData.rp_balance }).eq('id', user.id)
    return NextResponse.json({ error: accessError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
