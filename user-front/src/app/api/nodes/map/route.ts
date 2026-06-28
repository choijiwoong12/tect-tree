import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'

export async function GET() {
  // 1. 현재 로그인 유저 확인 (user 프로젝트)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 2. 어드민 DB에서 모든 노드 조회
  const { data: nodes, error } = await supabaseAdminDb
    .from('document_nodes')
    .select('id, parent_id, title, node_kind, pos_x, pos_y, is_locked, price')
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

  // 4. 로그인 상태라면 해금된 노드 ID 조회
  let unlockedIds: number[] = []
  if (user) {
    const { data: access } = await supabaseAdminDb
      .from('user_node_access')
      .select('node_id')
      .eq('user_id', user.id)

    unlockedIds = (access ?? []).map((a) => Number(a.node_id))
  }

  return NextResponse.json({ nodes: nodes ?? [], unlocked_ids: unlockedIds, viewport })
}
