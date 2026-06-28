import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'

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
  // is_locked=true 노드는 user_node_access 확인
  if (node.is_locked) {
    const { data: access } = await supabaseAdminDb
      .from('user_node_access')
      .select('id')
      .eq('user_id', user.id)
      .eq('node_id', nodeId)
      .maybeSingle()
    if (!access) return NextResponse.json({ error: 'No access' }, { status: 403 })
  }

  return NextResponse.json(node)
}
