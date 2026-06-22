'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useAppStore } from '@/store/useAppStore'
import { useEffect } from 'react'

export function Header() {
  const { user, loading, logout } = useAuth()
  const { rpBalance, setRpBalance } = useAppStore()
  const pathname = usePathname()

  // Sync RP balance from auth state to store on mount/user change
  useEffect(() => {
    if (user) {
      setRpBalance(user.rp_balance || 0)
    }
  }, [user, setRpBalance])

  if (loading || !user || pathname === '/') return null

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-background border-border sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href="/themes" className="text-xl font-bold tracking-wider">
          ATHENA DOCTRINE
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/themes" className={pathname.startsWith('/theme') ? 'text-accent' : 'text-fg/70 hover:text-fg'}>
            트리
          </Link>
          <Link href="/store" className={pathname.startsWith('/store') ? 'text-accent' : 'text-fg/70 hover:text-fg'}>
            상점
          </Link>
          <Link href="/mypage" className={pathname.startsWith('/mypage') ? 'text-accent' : 'text-fg/70 hover:text-fg'}>
            마이페이지
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full">
          <span className="text-sm font-semibold text-accent">RP</span>
          <span className="text-sm font-mono">{rpBalance.toLocaleString()}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-fg/80">{user.nickname}</span>
          <button 
            onClick={logout}
            className="text-xs px-2 py-1 bg-border/50 hover:bg-border rounded text-fg/70 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  )
}
