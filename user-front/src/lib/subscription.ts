import type { SupabaseClient } from '@supabase/supabase-js'

// 현재 구독 혜택이 유효한지 — 해지(status=canceled)했어도 next_billing_date 이전이면 '구독중'으로 본다.
// (결제 실패로 past_due가 되면 next_billing_date가 과거이므로 자동으로 false)
export async function isSubscribed(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('subscriptions')
    .select('next_billing_date')
    .eq('user_id', userId)
    .order('next_billing_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data?.next_billing_date) return false
  return new Date(data.next_billing_date).getTime() > Date.now()
}
