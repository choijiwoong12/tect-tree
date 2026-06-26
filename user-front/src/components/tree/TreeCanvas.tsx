'use client'

import { useCallback, useEffect } from 'react'
import { ReactFlow, useNodesState, Node, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { DotNode } from './DotNode'

const nodeTypes = { dot: DotNode }

// 트리는 어드민 document_nodes의 pos_x/pos_y(1920 디자인 좌표)를 그대로 쓴다.
// 현재 단계: 하드코딩 그래프 제거 후 루트(유저) 노드만 고정 배치. 어드민 노드 연동은 다음 단계.
const DESIGN_W = 1920
const DESIGN_H = 1080

// 루트(유저) 노드 — 디자인상 과녁 top-left (X612 Y703) = 중심 (627,718).
const ROOT_POS = { x: 612, y: 703 }

interface TreeCanvasProps {
  themeId: string
  isLoggedIn?: boolean
  rootLabel?: string // 로그인 시 콜사인-이름 (없으면 LOG IN)
  onLoginClick?: () => void
  onCenterClick?: () => void
  onOpenShop?: () => void
}

export function TreeCanvas({ isLoggedIn, rootLabel, onLoginClick, onCenterClick }: TreeCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState([
    { id: 'root', type: 'dot', position: ROOT_POS, data: { isRoot: true }, draggable: false } as Node,
  ])
  const { setViewport } = useReactFlow()

  // 트리를 1920 디자인 좌표공간에 정합 — DesignOverlay(상단기준·가로중앙)와 동일 스케일/오프셋.
  // 그래서 노드 pos_x/pos_y(디자인 px)가 헤더/정보 패널과 같은 위치·크기로 보인다.
  useEffect(() => {
    function align() {
      const scale = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
      const offsetX = (window.innerWidth - DESIGN_W * scale) / 2
      setViewport({ x: offsetX, y: 0, zoom: scale })
    }
    const id = setTimeout(align, 50)
    window.addEventListener('resize', align)
    return () => {
      clearTimeout(id)
      window.removeEventListener('resize', align)
    }
  }, [setViewport])

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (node.id !== 'root') return
      // 로그아웃: 구글 로그인 / 로그인: 회원정보 토글
      if (!isLoggedIn) onLoginClick?.()
      else onCenterClick?.()
    },
    [isLoggedIn, onLoginClick, onCenterClick],
  )

  const decorated = nodes.map((n) => ({
    ...n,
    data: { ...n.data, isLoggedIn, label: isLoggedIn ? rootLabel ?? '' : 'LOG IN' },
  }))

  return (
    <div className="relative z-10 h-full w-full">
      <ReactFlow
        nodes={decorated}
        edges={[]}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        style={{ background: 'transparent' }}
      />
    </div>
  )
}
