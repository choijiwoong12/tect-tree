'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useAppStore } from '@/store/useAppStore'

export default function MyPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { rpBalance } = useAppStore()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading || !user) return <div className="p-12">Loading...</div>

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">마이페이지</h1>
      
      <section className="bg-card border border-border p-6 rounded-xl mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1">{user.nickname} 요원</h2>
          <p className="text-fg/50 text-sm">{user.email}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-fg/50 mb-1">보유 RP</p>
          <p className="text-3xl font-mono font-bold text-accent">{rpBalance.toLocaleString()}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h3 className="text-xl font-bold mb-4 border-b border-border pb-2">최근 결제 내역</h3>
          <ul className="space-y-4">
            <li className="flex justify-between items-center p-4 bg-muted/20 rounded-lg border border-border/50">
              <div>
                <p className="font-semibold text-sm">5,000 RP 충전</p>
                <p className="text-xs text-fg/50">2026. 05. 24</p>
              </div>
              <span className="text-accent font-mono text-sm">+5,000</span>
            </li>
            <li className="text-center text-sm text-fg/50 py-4">더 이상 내역이 없습니다.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-4 border-b border-border pb-2">해금한 노드 목록</h3>
          <ul className="space-y-2">
            <li className="p-3 bg-muted/20 rounded border border-border/50 text-sm">루트: 알파</li>
            <li className="p-3 bg-muted/20 rounded border border-border/50 text-sm">기초 과학</li>
            <li className="text-center text-sm text-fg/50 py-4">더 이상 해금된 노드가 없습니다.</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
