'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { ReactFlowProvider } from '@xyflow/react'
import { TreeCanvas } from './TreeCanvas'
import { TopBar } from '@/components/common/TopBar'

interface TechTreeProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export function TechTree({ onLoginClick }: TechTreeProps) {
  const { user, logout } = useAuth()
  const [focusLabel, setFocusLabel] = useState<string>('')

  return (
    <div className="relative w-full h-screen athena-grid-bg overflow-hidden">
      <div className="athena-noise pointer-events-none absolute inset-0 z-0" />

      <TopBar
        rightLabel={user ? focusLabel : 'LOG IN'}
        onRightClick={user ? undefined : onLoginClick}
        showLogout={!!user}
        onLogout={logout}
      />

      <ReactFlowProvider>
        <TreeCanvas
          themeId="main-tree"
          isLoggedIn={!!user}
          onLoginClick={onLoginClick}
          onFocusChange={setFocusLabel}
        />
      </ReactFlowProvider>
    </div>
  )
}
