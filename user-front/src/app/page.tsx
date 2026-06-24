'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignupForm } from '@/components/auth/SignupForm'
import { TechTree } from '@/components/tree/TechTree'
import { CallSignWizard } from '@/components/callsign/CallSignWizard'
import { Minimize2 } from 'lucide-react'

type Step = 'INTRO_PLAYING' | 'MAIN_TREE' | 'LOGIN_MODAL' | 'SIGNUP_MODAL' | 'CALLSIGN';

export default function RootPage() {
  const [step, setStep] = useState<Step>('INTRO_PLAYING')
  const [introFrame, setIntroFrame] = useState(1)
  const [introOpacity, setIntroOpacity] = useState(1)
  const [treeVisible, setTreeVisible] = useState(false)

  useEffect(() => {
    if (step !== 'INTRO_PLAYING') return;

    const playSequence = async () => {
      setIntroFrame(1)
      await new Promise(r => setTimeout(r, 600))
      setIntroFrame(2)
      await new Promise(r => setTimeout(r, 100))
      setIntroFrame(3)
      await new Promise(r => setTimeout(r, 100))
      setIntroFrame(4)
      await new Promise(r => setTimeout(r, 166))
      setIntroFrame(5)
      await new Promise(r => setTimeout(r, 166))
      setIntroFrame(6)
      await new Promise(r => setTimeout(r, 166))
      setIntroOpacity(0)
      await new Promise(r => setTimeout(r, 1000))
      setStep('MAIN_TREE')
    }

    playSequence()
  }, [step])

  // Fade the main tree in from black once the intro is done.
  useEffect(() => {
    if (step !== 'INTRO_PLAYING' && !treeVisible) {
      // Wait one paint at opacity 0 so the transition actually runs.
      const id = setTimeout(() => setTreeVisible(true), 50)
      return () => clearTimeout(id)
    }
  }, [step, treeVisible])

  const isAuthModal = step === 'LOGIN_MODAL' || step === 'SIGNUP_MODAL'

  return (
    <main className="min-h-screen text-white relative overflow-hidden bg-black">
      {step === 'INTRO_PLAYING' && (
        <div
          className="absolute inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-1000 ease-in-out"
          style={{ opacity: introOpacity }}
        >
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <Image
              key={num}
              src={`/assets/Intro${num}.webp`}
              alt={`Intro Frame ${num}`}
              fill
              priority
              className={`object-cover transition-none ${introFrame === num ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>
      )}

      {step !== 'INTRO_PLAYING' && (
        <div
          className="absolute inset-0 z-10 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: treeVisible ? 1 : 0 }}
        >
          <TechTree
            onLoginClick={() => setStep('LOGIN_MODAL')}
            onSignupClick={() => setStep('SIGNUP_MODAL')}
          />
        </div>
      )}

      {isAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-20 pb-6">
          {/* Dimmed backdrop — the tree stays visible behind. Clicking closes. */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setStep('MAIN_TREE')}
          />

          {/* Login window — rounded black panel, kept below the top red layout */}
          <div className="relative w-full max-w-6xl h-[calc(100vh-7rem)] overflow-auto rounded-3xl bg-black border border-white/15 shadow-[0_0_60px_rgba(0,0,0,0.9)]">
            {/* Collapse / minimize back to the tree */}
            <button
              onClick={() => setStep('MAIN_TREE')}
              aria-label="닫기"
              className="absolute top-6 right-7 z-10 text-white/70 hover:text-white p-1 transition-colors"
            >
              <Minimize2 size={22} strokeWidth={1.5} />
            </button>

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 h-full px-12 py-12">
              <div className="flex-1 w-full flex justify-center md:justify-start">
                {step === 'LOGIN_MODAL' ? (
                  <LoginForm
                    onSuccess={() => setStep('MAIN_TREE')}
                    onSignupClick={() => setStep('SIGNUP_MODAL')}
                  />
                ) : (
                  <SignupForm onSuccess={() => setStep('CALLSIGN')} />
                )}
              </div>

              <div className="flex flex-1 justify-center items-end self-stretch">
                <img
                  src="/assets/athena.webp"
                  alt="Athena"
                  className="max-h-full max-w-md object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'CALLSIGN' && (
        <div className="fixed inset-0 z-[100] bg-black overflow-auto">
          {/* TODO: 완료 시 콜사인을 users 프로필(Supabase)에 저장 */}
          <CallSignWizard
            onComplete={() => setStep('MAIN_TREE')}
            onBack={() => setStep('SIGNUP_MODAL')}
          />
        </div>
      )}
    </main>
  )
}
