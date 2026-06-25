'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { ReactFlowProvider } from '@xyflow/react'
import { TreeCanvas } from './TreeCanvas'
import { TopBar } from '@/components/common/TopBar'
import { DesignOverlay } from '@/components/common/DesignOverlay'
import { InfoPanel } from '@/components/main/InfoPanel'
import { ShopModal } from '@/components/main/ShopModal'
import { CustomerServiceModal } from '@/components/main/CustomerServiceModal'
import { SubscriptionModal } from '@/components/main/SubscriptionModal'
import { NoticePage } from '@/components/main/NoticePage'

interface TechTreeProps {
  onLoginClick: () => void;
}

export function TechTree({ onLoginClick }: TechTreeProps) {
  const { user, logout } = useAuth()
  const [showMember, setShowMember] = useState(true)
  const [modal, setModal] = useState<null | 'shop' | 'cs' | 'sub' | 'notice'>(null)

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">

      {/* 트리 캔버스 — 풀블리드 네이티브 배경(z-10). ReactFlow는 CSS 스케일 시 좌표가 틀어져 그대로 둔다. */}
      <ReactFlowProvider>
        <TreeCanvas
          themeId="main-tree"
          isLoggedIn={!!user}
          onLoginClick={onLoginClick}
          onCenterClick={() => setShowMember((v) => !v)}
          onOpenShop={() => setModal('shop')}
        />
      </ReactFlowProvider>

      {/* 상시 UI(헤더·정보) — 모달과 동일한 1920 스케일 레이어. 클릭은 통과(내부 요소만 auto). */}
      <DesignOverlay z={40}>
        {/* 헤더: 로고 + RP (로그아웃은 회원정보 하단으로 이동) */}
        <TopBar
          rp={user?.rp_balance ?? 0}
          onRpClick={() => setModal('shop')}
        />
        <InfoPanel
          user={user}
          showMember={showMember}
          onOpenCustomerService={() => setModal('cs')}
          onOpenNotice={() => setModal('notice')}
          onOpenShop={() => setModal('shop')}
          onOpenSubscriptionManage={() => setModal('sub')}
          onLogout={logout}
        />
      </DesignOverlay>

      {modal === 'shop' && <ShopModal onClose={() => setModal(null)} />}
      {modal === 'cs' && <CustomerServiceModal onClose={() => setModal(null)} />}
      {modal === 'sub' && <SubscriptionModal onClose={() => setModal(null)} />}
      {modal === 'notice' && <NoticePage rp={user?.rp_balance ?? 0} onClose={() => setModal(null)} />}
    </div>
  )
}
