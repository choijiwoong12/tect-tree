'use client'

import { LogOut } from 'lucide-react'

interface TopBarProps {
  rp?: number
  onRpClick?: () => void
  showLogout?: boolean
  onLogout?: () => void
}

// Figma(2차 보완) 메인 헤더 — 1920 기준 픽셀 값:
// - 빨간 선: Y37, full width, #FE0000, 1px (글자 세로 중앙 관통)
// - 로고 ATHENA DOCTRINE: Sam3KRFont 27px, #fff, left 28 / Y24(중앙 정렬)
// - RP: 아이콘 21×20(흰 외곽선 1px)+내부 11×10 채움, gap 16, "0000" Sam3KRFont 27px, right margin 21
export function TopBar({ rp, onRpClick, showLogout, onLogout }: TopBarProps) {
  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-40 h-[74px] pointer-events-none">
        {/* 빨간 선 */}
        <div className="absolute left-0 right-0 top-[37px] h-px bg-[#FE0000]" />

        {/* 로고 */}
        <h1 className="absolute left-[28px] top-[37px] -translate-y-1/2 font-pixel text-[27px] leading-none text-white whitespace-nowrap">
          ATHENA DOCTRINE
        </h1>

        {/* RP 카운터 */}
        <button
          onClick={onRpClick}
          aria-label="RP / 상점"
          className="pointer-events-auto absolute right-[21px] top-[37px] -translate-y-1/2 flex items-center gap-[16px] text-white hover:text-[#FE0000] transition-colors"
        >
          <svg width="21" height="20" viewBox="0 0 21 20" aria-hidden="true" className="shrink-0">
            <rect x="0.5" y="0.5" width="20" height="19" fill="none" stroke="currentColor" strokeWidth="1" />
            <rect x="5" y="5" width="11" height="10" fill="currentColor" />
          </svg>
          <span className="font-pixel text-[27px] leading-none">{String(rp ?? 0).padStart(4, '0')}</span>
        </button>
      </div>

      {showLogout && (
        <div className="absolute top-[84px] right-6 z-40 flex flex-col items-end gap-3">
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
