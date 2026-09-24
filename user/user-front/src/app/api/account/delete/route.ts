import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin' // 유저 프로젝트 (service role)
import { supabaseAdminDb } from '@/lib/supabase/admin-db' // 어드민 프로젝트 (service role)

// POST /api/account/delete — 테스트용 회원탈퇴. 현재 유저의 모든 데이터를 두 프로젝트에서 삭제하고
// auth 계정까지 제거해 완전히 새 계정으로 재가입할 수 있게 한다.
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id
  const warnings: string[] = []
  const del = async (label: string, p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await p
    if (error) warnings.push(`${label}: ${error.message}`)
  }

  // 1) 어드민 프로젝트 — 노드 접근/읽기 진행도
  await del('user_node_access', supabaseAdminDb.from('user_node_access').delete().eq('user_id', uid))
  await del('reading_progress', supabaseAdminDb.from('reading_progress').delete().eq('user_id', uid))

  // 2) 유저 프로젝트 — 결제/주문/RP/구독 (자식 → 부모 순), 마지막에 users
  await del('payments', supabaseAdmin.from('payments').delete().eq('user_id', uid))
  await del('rp_transactions', supabaseAdmin.from('rp_transactions').delete().eq('user_id', uid))
  await del('orders', supabaseAdmin.from('orders').delete().eq('user_id', uid))
  await del('subscriptions', supabaseAdmin.from('subscriptions').delete().eq('user_id', uid))
  await del('users', supabaseAdmin.from('users').delete().eq('id', uid))

  // 3) auth 계정 삭제 — 실패하면 데이터가 일부 남았을 수 있으니 에러로 반환
  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(uid)
  if (delErr) {
    return NextResponse.json({ error: delErr.message, warnings }, { status: 500 })
  }

  // 4) 현재 세션 쿠키 정리 (계정은 이미 삭제됨)
  try {
    await supabase.auth.signOut()
  } catch {
    /* 세션이 이미 무효일 수 있음 — 무시 */
  }

  return NextResponse.json({ ok: true, warnings })
}
