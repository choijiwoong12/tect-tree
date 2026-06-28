import { NextResponse } from 'next/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'

// 개발용: document_nodes 컬럼 구조 확인 — 배포 후 삭제
export async function GET() {
  const { data, error } = await supabaseAdminDb
    .from('document_nodes')
    .select('*')
    .limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ columns: data?.[0] ? Object.keys(data[0]) : [], sample: data?.[0] })
}
