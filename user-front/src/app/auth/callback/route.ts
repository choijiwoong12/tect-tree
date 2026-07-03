import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const authError = searchParams.get('error_description')

  if (authError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(authError)}`)
  }

  if (code) {
    // cookies()는 Route Handler에서 읽기+쓰기 모두 가능 — 공식 Supabase SSR 패턴
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options)
              } catch { /* Server Component 컨텍스트에서 호출되면 무시 */ }
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[callback] exchangeCodeForSession error:', error.message)
      // 자기치유: 잔여/손상 sb-* 쿠키(구버전 포맷 등)가 원인일 수 있으므로 전부 제거하고 돌려보낸다.
      // 사용자는 아무 조치 없이 다음 로그인 시도가 깨끗한 상태에서 시작됨.
      const res = NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
      for (const c of cookieStore.getAll()) {
        if (c.name.startsWith('sb-')) {
          res.cookies.set(c.name, '', { maxAge: 0, path: '/' })
        }
      }
      return res
    }

    if (data.user) {
      const meta = (data.user.user_metadata ?? {}) as Record<string, string>
      const nickname = meta.nickname ?? meta.name ?? meta.full_name ?? data.user.email?.split('@')[0] ?? 'user'

      await supabaseAdmin.from('users').upsert(
        {
          id: data.user.id,
          email: data.user.email ?? '',
          nickname,
          profile_image_url: meta.avatar_url ?? meta.picture ?? null,
        },
        { onConflict: 'id' }
      )
      console.log('[callback] login success:', data.user.email)
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/`)
}
