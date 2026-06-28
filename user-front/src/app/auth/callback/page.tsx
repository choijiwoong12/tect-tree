'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'
    const authError = searchParams.get('error_description')

    function go(path: string) {
      // router.replace 후 window.location 폴백으로 확실히 이동
      try {
        router.replace(path)
      } catch {
        window.location.href = path
      }
      // 500ms 내에 이동 안 되면 강제 이동
      setTimeout(() => {
        window.location.href = path
      }, 500)
    }

    if (authError) {
      go(`/login?error=${encodeURIComponent(authError)}`)
      return
    }

    if (!code) {
      go('/')
      return
    }

    // 5초 이내에 exchange 안 끝나면 강제로 홈으로
    const forceTimer = setTimeout(() => {
      window.location.href = next
    }, 5000)

    async function exchange() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code!)

        clearTimeout(forceTimer)

        if (error) {
          console.error('[callback] exchangeCodeForSession error:', error.message)
          setErrorMsg(error.message)
          setTimeout(() => go(`/login?error=${encodeURIComponent(error.message)}`), 1500)
          return
        }

        console.log('[callback] session ok, user:', data.session?.user?.email)

        // user 테이블 upsert (비동기, 실패해도 로그인 유지)
        fetch('/api/auth/upsert-profile', { method: 'POST' }).catch(() => {})

        go(next)
      } catch (e) {
        clearTimeout(forceTimer)
        const msg = e instanceof Error ? e.message : 'Unknown error'
        console.error('[callback] exception:', msg)
        setErrorMsg(msg)
        setTimeout(() => go('/'), 1500)
      }
    }

    exchange()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white font-pixel">
        <p className="text-red-400">{errorMsg}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-2 w-2 animate-ping rounded-full bg-red-500" />
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="h-2 w-2 animate-ping rounded-full bg-red-500" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
