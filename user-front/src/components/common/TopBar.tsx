'use client'

import { LogOut, Maximize2, X } from 'lucide-react'

interface TopBarProps {
  rightLabel?: string
  showClose?: boolean
  showLogout?: boolean
  onRightClick?: () => void
  onClose?: () => void
  onLogout?: () => void
}

export function TopBar({ rightLabel, showClose, showLogout, onRightClick, onClose, onLogout }: TopBarProps) {
  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none athena-grid-bg">
        <div className="athena-noise absolute inset-0 -z-10" />
        
        {/* Thin toolbar for the title and line */}
        <div className="relative h-16">
          {/* Unbroken red rule */}
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-red-600" />
          
          {/* Title overlapping the red line */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center px-6">
            <h1 className="font-pixel text-2xl text-white tracking-[0.15em] leading-none drop-shadow-md">
              Athena Doctrine
            </h1>
          </div>
        </div>
      </div>

      {/* Buttons completely outside the toolbar's background, floating independently */}
      <div className="absolute top-20 right-6 z-40 pointer-events-auto flex flex-col items-end gap-3">
        {showClose && (
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-white/70 hover:text-white p-1 transition-colors"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        )}
        
        {!showClose && rightLabel ? (
          <div className="flex items-center gap-3 border border-white/30 bg-black/60 rounded-xl px-4 py-2">
            <button
              onClick={onRightClick}
              className="font-pixel text-base text-red-500 tracking-widest hover:text-red-400 transition-colors"
            >
              {rightLabel}
            </button>
            <Maximize2 size={14} strokeWidth={1.5} className="text-white/70" />
          </div>
        ) : null}

        {!showClose && showLogout && (
          <button
            onClick={onLogout}
            aria-label="로그아웃"
            title="로그아웃"
            className="flex items-center gap-1.5 border border-white/30 bg-black/60 rounded-xl px-4 py-2 text-white/70 hover:text-red-500 hover:border-red-500/50 transition-colors"
          >
            <LogOut size={16} strokeWidth={1.5} />
            <span className="font-pixel text-base tracking-widest">LOGOUT</span>
          </button>
        )}
      </div>
    </>
  )
}
