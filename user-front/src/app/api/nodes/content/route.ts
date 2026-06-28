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

  // 접근 권한 확인
  const { data: access } = await supabaseAdminDb
    .from('user_node_access')
    .select('id')
    .eq('user_id', user.id)
    .eq('node_id', nodeId)
    .maybeSingle()
  if (!access) return NextResponse.json({ error: 'No access' }, { status: 403 })

  const { data: node, error } = await supabaseAdminDb
    .from('document_nodes')
    .select('id, title, body_content, index_items')
    .eq('id', nodeId)
    .single()
  if (error || !node) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(node)
}
