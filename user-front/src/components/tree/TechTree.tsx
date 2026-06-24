'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { ReactFlowProvider } from '@xyflow/react'
import { TreeCanvas } from './TreeCanvas'
import { TopBar } from '@/components/common/TopBar'
import { InfoPanel } from '@/components/main/InfoPanel'
import { ShopModal } from '@/components/main/ShopModal'
import { CustomerServiceModal } from '@/components/main/CustomerServiceModal'

interface TechTreeProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export function TechTree({ onLoginClick }: TechTreeProps) {
  const { user, logout } = useAuth()
  const [focusLabel, setFocusLabel] = useState<string>('')
  const [showMember, setShowMember] = useState(false)
  const [modal, setModal] = useState<null | 'shop' | 'cs'>(null)

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
          onCenterClick={() => setShowMember((v) => !v)}
          onOpenShop={() => setModal('shop')}
        />
      </ReactFlowProvider>

      <InfoPanel
        user={user}
        showMember={showMember}
        onOpenCustomerService={() => setModal('cs')}
      />

      {modal === 'shop' && <ShopModal onClose={() => setModal(null)} />}
      {modal === 'cs' && <CustomerServiceModal onClose={() => setModal(null)} />}
    </div>
  )
}
