'use client'

import { useEffect, useRef, useState } from 'react'
import { SignupForm } from '@/components/auth/SignupForm'
import { TechTree } from '@/components/tree/TechTree'
import { CallSignWizard } from '@/components/callsign/CallSignWizard'
import { LandingIntro } from '@/components/main/LandingIntro'
import { TopBar } from '@/components/common/TopBar'
import { DesignFrame } from '@/components/common/DesignFrame'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'

type Step = 'INTRO_PLAYING' | 'MAIN_TREE' | 'SIGNUP_MODAL' | 'CALLSIGN';

export default function RootPage() {
  const { user, refreshUser } = useAuth()
  const [step, setStep] = useState<Step>('INTRO_PLAYING')
  const [treeVisible, setTreeVisible] = useState(false)
  const onboardingPrompted = useRef(false)

  // 인트로(올리브 드래그) 종료 후 트리를 검정에서 페이드인.
  useEffect(() => {
    if (step !== 'INTRO_PLAYING' && !treeVisible) {
      const id = setTimeout(() => setTreeVisible(true), 50)
      return () => clearTimeout(id)
    }
  }, [step, treeVisible])

  // 첫 로그인(콜사인 미설정) → 회원가입→콜사인 온보딩. 세션당 1회만 띄움
  // (홈 버튼으로 빠져나오면 같은 세션에선 다시 안 띄움).
  useEffect(() => {
    if (step === 'MAIN_TREE' && user && !user.callsign && !onboardingPrompted.current) {
      onboardingPrompted.current = true
      setStep('SIGNUP_MODAL')
    }
  }, [step, user])

  // LOG IN 노드 클릭 → 바로 구글 OAuth.
  async function handleGoogleLogin() {
    const supabase = createClient()
    const redirectTo = new URL('/auth/callback', window.location.origin)
    redirectTo.searchParams.set('next', '/')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo.toString() },
    })
  }

  // 회원가입 입력 → auth user_metadata에 저장(이름 등) → 콜사인 단계.
  async function handleSignupComplete(profile: { name: string; gender: string; age: string; phone: string }) {
    try {
      const supabase = createClient()
      await supabase.auth.updateUser({
        data: { name: profile.name, gender: profile.gender, age: profile.age, phone: profile.phone },
      })
    } catch (e) {
      console.warn('프로필 저장 실패(미로그인 상태일 수 있음):', e)
    }
    setStep('CALLSIGN')
  }

  // 콜사인 완료 → auth user_metadata에 저장 → 회원정보 갱신 → 메인.
  async function handleCallsignComplete(callSign: string) {
    try {
      const supabase = createClient()
      await supabase.auth.updateUser({ data: { callsign: callSign } })
      await refreshUser()
    } catch (e) {
      console.warn('콜사인 저장 실패(미로그인 상태일 수 있음):', e)
    }
    setStep('MAIN_TREE')
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
            {/* 홈(로고) 클릭 시 온보딩 중단하고 메인으로 */}
            <TopBar rp={0} onLogoClick={() => setStep('MAIN_TREE')} />
            <SignupForm onComplete={handleSignupComplete} onBack={() => setStep('MAIN_TREE')} />
          </DesignFrame>
        </div>
      )}

      {step === 'CALLSIGN' && (
        <div className="fixed inset-0 z-[100] bg-black">
          <DesignFrame>
            {/* 콜사인 정하는 중에도 홈(로고) 클릭 시 메인으로 나갈 수 있음 */}
            <TopBar rp={0} onLogoClick={() => setStep('MAIN_TREE')} />
            <CallSignWizard onComplete={handleCallsignComplete} onBack={() => setStep('MAIN_TREE')} />
          </DesignFrame>
        </div>
      )}

      {/* 개발용 임시 진입점: 미로그인 상태에서 회원가입/콜사인 UI 미리보기(저장은 안 됨). 프로덕션엔 숨김. */}
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
