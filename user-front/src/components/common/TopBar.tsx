'use client'

import { LogOut } from 'lucide-react'

interface TopBarProps {
  rp?: number
  onRpClick?: () => void
  showLogout?: boolean
  onLogout?: () => void
}

export function TopBar({ rp, onRpClick, showLogout, onLogout }: TopBarProps) {
  return (
    <>
      {/* 헤더: 빨간선이 글자 세로 중앙 관통, 로고(좌) + RP 카운터(우) */}
      <div className="absolute top-0 left-0 right-0 z-40 athena-grid-bg pointer-events-none">
        <div className="athena-noise absolute inset-0 -z-10" />
        <div className="relative h-16">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-red-600" />
          <div className="absolute inset-0 flex items-center justify-between px-6">
            <h1 className="font-pixel text-2xl text-white tracking-[0.15em] leading-none drop-shadow-md">
              ATHENA DOCTRINE
            </h1>
            <button
              onClick={onRpClick}
              className="pointer-events-auto flex items-center gap-2 font-pixel text-base text-white/90 hover:text-red-500 tracking-widest transition-colors"
              aria-label="RP / 상점"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
                <rect x="1" y="1" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <rect x="4.5" y="4.5" width="5" height="5" fill="currentColor" />
              </svg>
              {String(rp ?? 0).padStart(4, '0')}
            </button>
          </div>
        </div>
      </div>

      {showLogout && (
        <div className="absolute top-20 right-6 z-40 flex flex-col items-end gap-3">
          <button
            onClick={onLogout}
            aria-label="로그아웃"
            title="로그아웃"
            className="flex items-center gap-1.5 border border-white/30 bg-black/60 rounded-xl px-4 py-2 text-white/70 hover:text-red-500 hover:border-red-500/50 transition-colors"
          >
            <LogOut size={16} strokeWidth={1.5} />
            <span className="font-pixel text-base tracking-widest">LOGOUT</span>
          </button>
        </div>
      )}
    </>
  )
}
