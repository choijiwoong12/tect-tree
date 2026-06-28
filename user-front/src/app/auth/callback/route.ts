import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const authError = requestUrl.searchParams.get('error_description')

  if (authError) {
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', authError)
    return NextResponse.redirect(loginUrl)
  }

  // response를 먼저 만들고 여기에 Set-Cookie를 붙여야 브라우저가 세션을 받음
  const response = NextResponse.redirect(new URL(next, requestUrl.origin))

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', error.message)
      return NextResponse.redirect(loginUrl)
    }

    if (data.user) {
      const metadata = data.user.user_metadata ?? {}
      const nickname =
        (metadata.nickname as string) ??
        (metadata.name as string) ??
        (metadata.full_name as string) ??
        data.user.email?.split('@')[0] ??
        'user'

      await supabaseAdmin.from('users').upsert(
        {
          id: data.user.id,
          email: data.user.email ?? '',
          nickname,
          profile_image_url: (metadata.avatar_url ?? metadata.picture ?? null) as string | null,
        },
        { onConflict: 'id' }
      )
    }
  }

  return response
}
