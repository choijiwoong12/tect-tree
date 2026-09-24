import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'
import { isSubscribed } from '@/lib/subscription'

function isRootNode(n: { node_kind: string | null; title: string }) {
  return n.node_kind === 'root' || n.title === 'Root'
}

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

  // 노드 정보 조회
  const { data: node } = await supabaseAdminDb
    .from('document_nodes')
    .select('id, price, node_kind, title, is_locked')
    .eq('id', nodeId)
    .single()
  if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 })

  // 루트 노드는 해금 불필요
  if (isRootNode(node)) return NextResponse.json({ ok: true })

  // 인접 노드 해금 여부 확인 (node_edges 기반 정책)
  const [{ data: nodeEdges }, { data: allNodes }, { data: access }] = await Promise.all([
    supabaseAdminDb
      .from('node_edges')
      .select('source_id, target_id')
      .or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`),
    supabaseAdminDb
      .from('document_nodes')
      .select('id, node_kind, title, is_locked'),
    supabaseAdminDb
      .from('user_node_access')
      .select('node_id')
      .eq('user_id', user.id),
  ])

  const subscribed = await isSubscribed(supabase, user.id)
  const userUnlockedSet = new Set((access ?? []).map((a) => Number(a.node_id)))
  if (subscribed) {
    for (const n of allNodes ?? []) {
      if (n.is_locked) userUnlockedSet.add(Number(n.id))
    }
  }

  const nodeByIdMap = new Map((allNodes ?? []).map((n) => [Number(n.id), n]))
  const isUnlockedById = (id: number) => {
    const n = nodeByIdMap.get(id)
    if (!n) return false
    if (isRootNode(n)) return true
    return !n.is_locked || userUnlockedSet.has(id)
  }

  const neighborIds = (nodeEdges ?? []).map((e) =>
    e.source_id === nodeId ? e.target_id : e.source_id,
  )
  const hasUnlockedNeighbor = neighborIds.some((id) => isUnlockedById(id))
  if (!hasUnlockedNeighbor) {
    return NextResponse.json({ error: 'Node not adjacent to any unlocked node' }, { status: 403 })
  }

  if (method === 'subscription') {
    if (!subscribed) {
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

  const { error: accessError } = await supabaseAdminDb.from('user_node_access').insert({
    user_id: user.id,
    node_id: nodeId,
    source: 'purchase',
    granted_at: new Date().toISOString(),
  })
  if (accessError) {
    await supabase.from('users').update({ rp_balance: userData.rp_balance }).eq('id', user.id)
    return NextResponse.json({ error: accessError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
