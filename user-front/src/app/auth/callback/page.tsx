'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'
    const authError = searchParams.get('error_description')

    if (authError) {
      router.push(`/login?error=${encodeURIComponent(authError)}`)
      return
    }

    async function exchange() {
      if (!code) {
        router.push('/')
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        router.push(`/login?error=${encodeURIComponent(error.message)}`)
        return
      }

      // user 테이블 upsert는 서버 API에 위임 (비동기, 실패해도 로그인은 유지됨)
      fetch('/api/auth/upsert-profile', { method: 'POST' }).catch(() => {})

      router.push(next)
    }

    exchange()
  }, [searchParams, router])

  return null
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
