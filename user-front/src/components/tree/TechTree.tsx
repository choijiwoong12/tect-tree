'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { ReactFlowProvider } from '@xyflow/react'
import { TreeCanvas } from './TreeCanvas'
import { TopBar } from '@/components/common/TopBar'
import { InfoPanel } from '@/components/main/InfoPanel'
import { ShopModal } from '@/components/main/ShopModal'
import { CustomerServiceModal } from '@/components/main/CustomerServiceModal'
import { SubscriptionModal } from '@/components/main/SubscriptionModal'

interface TechTreeProps {
  onLoginClick: () => void;
}

export function TechTree({ onLoginClick }: TechTreeProps) {
  const { user, logout } = useAuth()
  const [showMember, setShowMember] = useState(true)
  const [modal, setModal] = useState<null | 'shop' | 'cs' | 'sub'>(null)

  return (
    <div className="relative w-full h-screen athena-grid-bg overflow-hidden">
      <div className="athena-noise pointer-events-none absolute inset-0 z-0" />

      <TopBar
        rp={user?.rp_balance ?? 0}
        onRpClick={() => setModal('shop')}
        showLogout={!!user}
        onLogout={logout}
      />

      <ReactFlowProvider>
        <TreeCanvas
          themeId="main-tree"
          isLoggedIn={!!user}
          onLoginClick={onLoginClick}
          onCenterClick={() => setShowMember((v) => !v)}
          onOpenShop={() => setModal('shop')}
        />
      </ReactFlowProvider>

      <InfoPanel
        user={user}
        showMember={showMember}
        onOpenCustomerService={() => setModal('cs')}
        onOpenShop={() => setModal('shop')}
        onOpenSubscriptionManage={() => setModal('sub')}
      />

      {modal === 'shop' && <ShopModal onClose={() => setModal(null)} />}
      {modal === 'cs' && <CustomerServiceModal onClose={() => setModal(null)} />}
      {modal === 'sub' && <SubscriptionModal onClose={() => setModal(null)} />}
    </div>
  )
}
