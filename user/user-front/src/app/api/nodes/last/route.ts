import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'

// GET /api/nodes/last — 가장 최근에 열람한 노드(id, title). 새로고침 후 LAST NOD 복원용.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ last: null })

  const { data: prog } = await supabaseAdminDb
    .from('reading_progress')
    .select('node_id, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!prog) return NextResponse.json({ last: null })

  const { data: node } = await supabaseAdminDb
    .from('document_nodes')
    .select('id, title')
    .eq('id', prog.node_id)
    .maybeSingle()

  if (!node) return NextResponse.json({ last: null })
  return NextResponse.json({ last: { id: node.id, title: node.title } })
}
