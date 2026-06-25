'use client'

import { useEffect, useState } from 'react'
import { SignupForm } from '@/components/auth/SignupForm'
import { TechTree } from '@/components/tree/TechTree'
import { CallSignWizard } from '@/components/callsign/CallSignWizard'
import { LandingIntro } from '@/components/main/LandingIntro'
import { TopBar } from '@/components/common/TopBar'
import { DesignFrame } from '@/components/common/DesignFrame'
import { createClient } from '@/lib/supabase/client'

type Step = 'INTRO_PLAYING' | 'MAIN_TREE' | 'SIGNUP_MODAL' | 'CALLSIGN';

export default function RootPage() {
  const [step, setStep] = useState<Step>('INTRO_PLAYING')
  const [treeVisible, setTreeVisible] = useState(false)

  // 인트로(올리브 드래그) 종료 후 트리를 검정에서 페이드인.
  useEffect(() => {
    if (step !== 'INTRO_PLAYING' && !treeVisible) {
      const id = setTimeout(() => setTreeVisible(true), 50)
      return () => clearTimeout(id)
    }
  }, [step, treeVisible])

  // LOG IN 노드 클릭 → 바로 구글 OAuth. (첫 로그인 시 회원가입 라우팅은 콜백/프로필 확인 후 — TODO)
  async function handleGoogleLogin() {
    const supabase = createClient()
    const redirectTo = new URL('/auth/callback', window.location.origin)
    redirectTo.searchParams.set('next', '/')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo.toString() },
    })
  }

  return (
    <main className="min-h-screen text-white relative overflow-hidden bg-black">
      {step === 'INTRO_PLAYING' && (
        <div className="absolute inset-0 z-50">
          <LandingIntro onEnter={() => setStep('MAIN_TREE')} />
        </div>
      )}

      {step !== 'INTRO_PLAYING' && (
        <div
          className="absolute inset-0 z-10 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: treeVisible ? 1 : 0 }}
        >
          <TechTree onLoginClick={handleGoogleLogin} />
        </div>
      )}

      {step === 'SIGNUP_MODAL' && (
        <div className="fixed inset-0 z-[100] bg-black">
          <DesignFrame>
            <TopBar rp={0} />
            <SignupForm
              onComplete={() => setStep('CALLSIGN')}
              onBack={() => setStep('MAIN_TREE')}
            />
          </DesignFrame>
        </div>
      )}

      {step === 'CALLSIGN' && (
        <div className="fixed inset-0 z-[100] bg-black">
          {/* TODO: 완료 시 콜사인을 users 프로필(Supabase)에 저장 */}
          <DesignFrame>
            <TopBar rp={0} />
            <CallSignWizard
              onComplete={() => setStep('MAIN_TREE')}
              onBack={() => setStep('MAIN_TREE')}
            />
          </DesignFrame>
        </div>
      )}

      {/* 개발용 임시 진입점: 첫 로그인 라우팅(회원가입→콜사인) 연결 전까지 리뷰용. 프로덕션엔 숨김. TODO 제거 */}
      {step === 'MAIN_TREE' && process.env.NODE_ENV !== 'production' && (
        <button
          onClick={() => setStep('SIGNUP_MODAL')}
          title="개발용: 회원가입/콜사인 미리보기"
          className="fixed bottom-4 right-4 z-[90] font-pixel text-[11px] text-white/40 hover:text-white/80 border border-white/20 bg-black/60 rounded px-3 py-1.5 transition-colors"
        >
          ▶ 가입/콜사인 미리보기 (dev)
        </button>
      )}
    </main>
  )
}
