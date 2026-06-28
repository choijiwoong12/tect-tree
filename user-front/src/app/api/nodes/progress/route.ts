import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'

// GET /api/nodes/progress?id=nodeId — 읽기 진행도 조회
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const nodeId = Number(searchParams.get('id'))
  if (!nodeId) return NextResponse.json({ read_items: [] })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ read_items: [] })

  const { data } = await supabaseAdminDb
    .from('reading_progress')
    .select('read_items')
    .eq('user_id', user.id)
    .eq('node_id', nodeId)
    .maybeSingle()

  return NextResponse.json({ read_items: data?.read_items ?? [] })
}

// POST /api/nodes/progress — 읽기 진행도 저장
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nodeId, readItems } = await req.json() as { nodeId: number; readItems: string[] }

  await supabaseAdminDb
    .from('reading_progress')
    .upsert(
      { user_id: user.id, node_id: nodeId, read_items: readItems, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,node_id' }
    )

  return NextResponse.json({ ok: true })
}
