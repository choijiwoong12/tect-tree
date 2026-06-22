'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'

// Mock themes (In the future, this could be fetched from Supabase)
const MOCK_THEMES = [
  { id: 'theme-alpha', title: '알파 프로토콜', description: '가장 기초적인 지식 구조가 담긴 테크트리.', unlocked: true },
  { id: 'theme-beta', title: '베타 컴플렉스', description: '심화된 기술과 응용 과학에 대한 트리.', unlocked: false },
  { id: 'theme-gamma', title: '감마 넥서스', description: '알려지지 않은 고대 문명의 지식.', unlocked: false },
]

export default function ThemesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading || !user) return <div className="p-12">Loading...</div>

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">루트 아카이브 (테마 선택)</h1>
        <p className="text-fg/70">탐색하고자 하는 지식의 근원(루트 노드)을 선택하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MOCK_THEMES.map(theme => (
          <div 
            key={theme.id}
            className={`
              relative p-6 rounded-xl border transition-all
              ${theme.unlocked 
                ? 'bg-card border-border hover:border-accent hover:shadow-[0_0_15px_rgba(var(--accent),0.2)] cursor-pointer' 
                : 'bg-muted/30 border-border/50 opacity-60 cursor-not-allowed'}
            `}
            onClick={() => {
              if (theme.unlocked) {
                router.push(`/tree/${theme.id}`)
              }
            }}
          >
            <h2 className="text-2xl font-bold mb-2">{theme.title}</h2>
            <p className="text-sm text-fg/60 mb-6">{theme.description}</p>
            
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${theme.unlocked ? 'bg-accent/20 text-accent' : 'bg-fg/10 text-fg/50'}`}>
                {theme.unlocked ? '접근 가능' : '해금 필요 (추후 지원)'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
