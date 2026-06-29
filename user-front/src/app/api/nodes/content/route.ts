import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'
import { isSubscribed } from '@/lib/subscription'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const nodeId = Number(searchParams.get('id'))
  if (!nodeId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: node, error } = await supabaseAdminDb
    .from('document_nodes')
    .select('id, title, body_content, index_items, is_locked')
    .eq('id', nodeId)
    .single()
  if (error || !node) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // is_locked=false 노드는 로그인만 되면 무료 접근
  // is_locked=true 노드는 구독 중이거나(동적 접근) 접근권 행이 있으면(RP 구매=영구) 열람 가능
  if (node.is_locked) {
    let ok = await isSubscribed(supabase, user.id)
    if (!ok) {
      const { data: access } = await supabaseAdminDb
        .from('user_node_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('node_id', nodeId)
        .maybeSingle()
      ok = !!access
    }
    if (!ok) return NextResponse.json({ error: 'No access' }, { status: 403 })
  }

  return NextResponse.json(node)
}
