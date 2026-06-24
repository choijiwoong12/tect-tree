import { createBrowserClient } from '@supabase/ssr'

let supabase: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (supabase) return supabase

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    // 프로덕션에선 설정 누락을 명확히 알린다.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Supabase URL/anon key가 설정되지 않았습니다 (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).'
      )
    }
    // 로컬 UI 확인용: env가 없으면 placeholder로 생성해 앱이 로그아웃 상태로 뜨게 한다.
    // 실제 인증/데이터를 쓰려면 user-front/.env.local에 키를 넣을 것.
    console.warn(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY 미설정 — 로그아웃 상태로 동작합니다. 실제 인증/데이터는 .env.local에 키 필요.'
    )
    supabase = createBrowserClient('http://localhost:54321', 'local-anon-placeholder')
    return supabase
  }

  supabase = createBrowserClient(url, anonKey)
  return supabase
}
