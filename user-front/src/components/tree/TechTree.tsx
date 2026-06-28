'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { ReactFlowProvider } from '@xyflow/react'
import { TreeCanvas, type ContentNodeInfo } from './TreeCanvas'
import { UnlockModal } from './UnlockModal'
import { DocumentViewer } from './DocumentViewer'
import { TopBar } from '@/components/common/TopBar'
import { DesignOverlay } from '@/components/common/DesignOverlay'
import { InfoPanel } from '@/components/main/InfoPanel'
import { ShopModal } from '@/components/main/ShopModal'
import { CustomerServiceModal } from '@/components/main/CustomerServiceModal'
import { SubscriptionModal } from '@/components/main/SubscriptionModal'
import { NoticePage } from '@/components/main/NoticePage'

interface TechTreeProps {
  onLoginClick: () => void;
  onEditCallsign?: () => void;
}

export function TechTree({ onLoginClick, onEditCallsign }: TechTreeProps) {
  const { user, logout, refreshUser } = useAuth()
  const [showMember, setShowMember] = useState(true)
  const [modal, setModal] = useState<null | 'shop' | 'cs' | 'sub' | 'notice'>(null)
  const [unlockTarget, setUnlockTarget] = useState<ContentNodeInfo | null>(null)
  const [viewerNodeId, setViewerNodeId] = useState<number | null>(null)
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(new Set())

  const hasSubscription = !!(user?.subscribedUntil && new Date(user.subscribedUntil) > new Date())

  function handleContentNodeClick(info: ContentNodeInfo) {
    if (info.isUnlocked || unlockedIds.has(info.nodeId)) {
      setViewerNodeId(info.nodeId)
    } else {
      setUnlockTarget(info)
    }
  }

  async function handleUnlock(method: 'rp' | 'subscription') {
    if (!unlockTarget) return
    const res = await fetch('/api/nodes/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: unlockTarget.nodeId, method }),
    })
    if (res.ok) {
      setUnlockedIds((prev) => new Set([...prev, unlockTarget.nodeId]))
      setUnlockTarget(null)
      setViewerNodeId(unlockTarget.nodeId)
      if (method === 'rp') await refreshUser() // RP 잔액 갱신
    } else {
      const { error } = await res.json()
      if (error === 'Insufficient RP' || error === 'No active subscription') {
        setUnlockTarget(null)
        setModal('shop')
      }
    }
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <ReactFlowProvider>
        <TreeCanvas
          themeId="main-tree"
          isLoggedIn={!!user}
          rootLabel={user ? [user.callsign, user.name].filter(Boolean).join(' ') || user.nickname || 'YOU' : undefined}
          onLoginClick={onLoginClick}
          onCenterClick={() => setShowMember((v) => !v)}
          onOpenShop={() => setModal('shop')}
          onContentNodeClick={handleContentNodeClick}
          sessionUnlockedIds={unlockedIds}
        />
      </ReactFlowProvider>

      <DesignOverlay z={40}>
        <TopBar
          rp={user?.rp_balance ?? 0}
          onRpClick={user ? () => setModal('shop') : undefined}
        />
        <InfoPanel
          user={user}
          showMember={showMember}
          onEditCallsign={onEditCallsign}
          onOpenCustomerService={() => setModal('cs')}
          onOpenNotice={() => setModal('notice')}
          onOpenShop={() => setModal('shop')}
          onOpenSubscriptionManage={() => setModal('sub')}
          onLogout={logout}
        />
      </DesignOverlay>

      {/* 노드 열람 모달 */}
      {unlockTarget && (
        <UnlockModal
          label={unlockTarget.title}
          cost={unlockTarget.price ?? 0}
          rpBalance={user?.rp_balance ?? 0}
          hasSubscription={hasSubscription}
          onClose={() => setUnlockTarget(null)}
          onUnlockRP={() => handleUnlock('rp')}
          onUnlockSubscription={() => handleUnlock('subscription')}
          onOpenShop={() => { setUnlockTarget(null); setModal('shop') }}
        />
      )}

      {/* 노드 문서 뷰어 */}
      {viewerNodeId !== null && (
        <DocumentViewer
          nodeId={viewerNodeId}
          onClose={() => setViewerNodeId(null)}
        />
      )}

      {modal === 'shop' && <ShopModal onClose={() => setModal(null)} />}
      {modal === 'cs' && <CustomerServiceModal onClose={() => setModal(null)} />}
      {modal === 'sub' && <SubscriptionModal onClose={() => setModal(null)} />}
      {modal === 'notice' && <NoticePage rp={user?.rp_balance ?? 0} onClose={() => setModal(null)} />}
    </div>
  )
}
