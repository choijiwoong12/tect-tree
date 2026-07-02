import { NextResponse } from 'next/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'

// GET /api/notices — 어드민 announcements(공지사항) 중 활성화된 것만, 정렬 순서대로.
// NoticePage의 '주의사항' 항목에 연결됨(로그인 여부와 무관한 공개 정보).
export async function GET() {
  const { data, error } = await supabaseAdminDb
    .from('announcements')
    .select('id, title, content')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notices: data ?? [] })
}
