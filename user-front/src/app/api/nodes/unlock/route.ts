import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'

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

  if (method === 'rp') {
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

  } else if (method === 'subscription') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (!sub) return NextResponse.json({ error: 'No active subscription' }, { status: 402 })
  }

  await supabaseAdminDb.from('user_node_access').insert({
    user_id: user.id,
    node_id: nodeId,
    source: method,
    granted_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
