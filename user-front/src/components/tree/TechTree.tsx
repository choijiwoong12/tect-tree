'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { ReactFlowProvider } from '@xyflow/react'
import { TreeCanvas, type ContentNodeInfo, type TreeCanvasHandle } from './TreeCanvas'
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
  // 이번 세션에 새로 '열어본' 노드 — 즉시 흰색/큰 노드로 반영
  const [viewedIds, setViewedIds] = useState<Set<number>>(new Set())
  // 마지막으로 열람한 노드 — 회원정보 LAST NOD 표시 + 클릭 시 센터링
  const [lastNode, setLastNode] = useState<{ id: number; title: string } | null>(null)
  // 해금 진행률(%) — 회원정보 PROGRESS
  const [progress, setProgress] = useState(0)
  const canvasRef = useRef<TreeCanvasHandle>(null)

  const hasSubscription = !!(user?.subscribedUntil && new Date(user.subscribedUntil) > new Date())

  // 새로고침 후에도 마지막 열람 노드 복원 (reading_progress 최신 기록)
  useEffect(() => {
    if (!user) { setLastNode(null); return }
    fetch('/api/nodes/last')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.last) setLastNode(d.last) })
      .catch(() => {})
  }, [user])

  function openViewer(nodeId: number, title: string) {
    setViewerNodeId(nodeId)
    setLastNode({ id: nodeId, title })
    // 한 번 열면 '열람한' 노드로 → 흰색/큰 노드로 즉시 전환
    setViewedIds((prev) => (prev.has(nodeId) ? prev : new Set([...prev, nodeId])))
  }

  // 테스트용 회원탈퇴 — 유저 데이터 전체 삭제 + auth 계정 제거 후 인트로로 리셋
  async function handleDeleteAccount() {
    if (!confirm('회원탈퇴(테스트): 내 모든 데이터와 계정이 삭제됩니다. 진행할까요?')) return
    const res = await fetch('/api/account/delete', { method: 'POST' })
    if (res.ok) {
      await logout()
      window.location.href = '/'
    } else {
      alert('회원탈퇴 실패 — 콘솔/네트워크를 확인하세요.')
    }
  }

  function handleContentNodeClick(info: ContentNodeInfo) {
    // 접근 가능(무료/구매/구독)하면 바로 열람(=열람한 노드로 전환), 아니면 해금 모달
    if (info.isUnlocked || viewedIds.has(info.nodeId)) {
      openViewer(info.nodeId, info.title)
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
      const { nodeId, title } = unlockTarget
      setUnlockTarget(null)
      openViewer(nodeId, title) // 열람 → viewedIds 반영(흰색/큰 노드)
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
          ref={canvasRef}
          themeId="main-tree"
          isLoggedIn={!!user}
          rootLabel={user ? [user.callsign, user.name].filter(Boolean).join(' ') || user.nickname || 'YOU' : undefined}
          onLoginClick={onLoginClick}
          onCenterClick={() => setShowMember((v) => !v)}
          onOpenShop={() => setModal('shop')}
          onContentNodeClick={handleContentNodeClick}
          sessionViewedIds={viewedIds}
          onProgress={setProgress}
        />
      </ReactFlowProvider>

      <DesignOverlay z={40}>
        <TopBar
          rp={user?.rp_balance ?? 0}
          onRpClick={user ? () => setModal('shop') : undefined}
          onLogoClick={() => canvasRef.current?.resetView()}
        />
        <InfoPanel
          user={user}
          showMember={showMember}
          lastNode={lastNode}
          progress={progress}
          onLastNodeClick={lastNode ? () => canvasRef.current?.centerOnNode(lastNode.id) : undefined}
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

      {/* 노드 문서 뷰어 — 닫을 때 읽은 목차 수를 그래프 TOC에 반영 */}
      {viewerNodeId !== null && (
        <DocumentViewer
          nodeId={viewerNodeId}
          onClose={() => {
            const id = viewerNodeId
            setViewerNodeId(null)
            canvasRef.current?.refreshNodeProgress(id)
          }}
        />
      )}

      {/* 테스트용 회원탈퇴 버튼 — 우하단 구석 (로그인 상태에서만) */}
      {user && (
        <button
          onClick={handleDeleteAccount}
          className="pointer-events-auto fixed bottom-4 right-4 z-50 rounded-md border border-red-600/60 bg-black/70 px-3 py-1.5 font-pixel text-[12px] tracking-widest text-red-500/80 transition-colors hover:bg-red-600 hover:text-white"
        >
          회원탈퇴 (TEST)
        </button>
      )}

      {modal === 'shop' && <ShopModal onClose={() => setModal(null)} />}
      {modal === 'cs' && <CustomerServiceModal onClose={() => setModal(null)} />}
      {modal === 'sub' && <SubscriptionModal onClose={() => setModal(null)} />}
      {modal === 'notice' && <NoticePage rp={user?.rp_balance ?? 0} onClose={() => setModal(null)} />}
    </div>
  )
}
