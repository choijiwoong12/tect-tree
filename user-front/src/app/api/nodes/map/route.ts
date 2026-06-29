import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'
import { isSubscribed } from '@/lib/subscription'

// index_items(jsonb)를 제목 문자열 배열로 정규화 — 문자열 배열 / {title} 배열 모두 대응
function parseIndexItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) =>
    typeof item === 'string' ? item : (item as Record<string, string>)?.title ?? String(item),
  )
}

export async function GET() {
  // 1. 현재 로그인 유저 확인 (user 프로젝트)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 2. 어드민 DB에서 모든 노드 조회 (목차 index_items 포함)
  const { data: nodes, error } = await supabaseAdminDb
    .from('document_nodes')
    .select('id, parent_id, title, node_kind, pos_x, pos_y, is_locked, price, index_items')
    .order('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 3. 어드민 저장 viewport 조회
  const { data: setting } = await supabaseAdminDb
    .from('settings')
    .select('value')
    .eq('key', 'graph_viewport')
    .single()

  const raw = setting?.value ?? { x: 0, y: 0, zoom: 1 }
  // 어드민 캔버스는 사이드바(220px) 때문에 220px 오른쪽에서 시작하므로
  // 유저(풀스크린)에서 동일한 화면 위치로 보이려면 viewport.x를 +220 보정한다
  const viewport = { ...raw, x: raw.x + 220 }

  // 4. 로그인 상태라면 해금된 노드 ID + 노드별 읽은 목차 수 조회
  //    - user_node_access 행(RP 구매=purchase 등)은 영구 해금
  //    - 구독 중이면 모든 잠긴 노드를 동적으로 해금(구독 끝나면 행이 없어 자동 재잠금)
  const unlockedSet = new Set<number>()
  const readCountByNode = new Map<number, number>()
  if (user) {
    const subscribed = await isSubscribed(supabase, user.id)
    const { data: access } = await supabaseAdminDb
      .from('user_node_access')
      .select('node_id')
      .eq('user_id', user.id)
    for (const a of access ?? []) unlockedSet.add(Number(a.node_id))
    if (subscribed) {
      for (const n of nodes ?? []) {
        if (n.is_locked) unlockedSet.add(Number(n.id))
      }
    }

    const { data: progress } = await supabaseAdminDb
      .from('reading_progress')
      .select('node_id, read_items')
      .eq('user_id', user.id)
    for (const row of progress ?? []) {
      const items = Array.isArray(row.read_items) ? row.read_items : []
      readCountByNode.set(Number(row.node_id), items.length)
    }
  }
  const unlockedIds = Array.from(unlockedSet)

  // 5. 응답 — 노드마다 목차 개수(index_count)와 읽은 개수(read_count) 부여.
  //    목차 제목(index_items)은 해금된 노드만 노출(잠긴 노드는 개수만 = 원만 그림).
  const enriched = (nodes ?? []).map((n) => {
    const items = parseIndexItems(n.index_items)
    const accessible = !n.is_locked || unlockedSet.has(Number(n.id))
    return {
      id: n.id,
      parent_id: n.parent_id,
      title: n.title,
      node_kind: n.node_kind,
      pos_x: n.pos_x,
      pos_y: n.pos_y,
      is_locked: n.is_locked,
      price: n.price,
      index_count: items.length,
      index_items: accessible ? items : [],
      read_count: readCountByNode.get(Number(n.id)) ?? 0,
    }
  })

  return NextResponse.json({ nodes: enriched, unlocked_ids: unlockedIds, viewport })
}
