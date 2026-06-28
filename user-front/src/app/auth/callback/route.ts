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
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
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
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/`)
}
