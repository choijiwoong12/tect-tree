'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Viewport,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { DotNode } from './DotNode'
import { DetailVisibleContext } from './treeViewContext'

const nodeTypes = { dot: DotNode }

// 줌이 '기본 프레이밍 줌 × 이 비율' 아래로 내려가면 별자리 모드(회색 노드/엣지 숨김, 흰색만 남김)
const DETAIL_ZOOM_FACTOR = 0.55

// 미열람 연결선(회색 1px) / 열람-열람 연결선(흰 2px) — 피그마: 미열람 간선은 #404040, 절반 굵기
const EDGE_DIM = { stroke: '#404040', strokeWidth: 1 }
const EDGE_ACTIVE = { stroke: '#ffffff', strokeWidth: 2 }

function isRootNode(n: ApiNode) {
  return n.node_kind === 'root' || n.title === 'Root'
}

// 노드가 '열람(흰색)' 상태인지 — 루트는 항상 활성, 그 외엔 로그인 + (무료거나 해금됨)
function isNodeUnlocked(n: ApiNode, isLoggedIn: boolean, unlocked: Set<number>): boolean {
  if (isRootNode(n)) return true
  if (!isLoggedIn) return false
  return !n.is_locked || unlocked.has(n.id)
}

// 해금 진행률(%) = 해금된 콘텐츠 노드 수 / 전체 콘텐츠 노드 수 (루트 제외). 흰 노드 비율과 동일.
function computeProgress(nodes: ApiNode[], isLoggedIn: boolean, unlocked: Set<number>): number {
  const content = nodes.filter((n) => !isRootNode(n))
  if (content.length === 0) return 0
  const open = content.filter((n) => isNodeUnlocked(n, isLoggedIn, unlocked)).length
  return (open / content.length) * 100
}

// 디자인 프레임(1920×1080) — 헤더/정보패널(DesignOverlay)과 동일한 좌표계.
// 기본 메인 화면 = 루트(과녁) 노드를 Figma 디자인 좌표에 고정 배치. 어드민 viewport와 무관.
const DESIGN_W = 1920
const DESIGN_H = 1080
const ROOT_DESIGN_X = 627 // Figma: 루트 과녁 중심 X (Ellipse24 622+5)
const ROOT_DESIGN_Y = 718 // Figma: 루트 과녁 중심 Y (713+5)

// DesignOverlay와 동일: min(가로,세로) 스케일, 가로 중앙·상단 기준
function designScale(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
}

// 루트의 절대 flow 좌표를 받아, 루트가 디자인 좌표(ROOT_DESIGN_X/Y)에 오도록 viewport 계산.
// (DB 좌표는 손대지 않음 — 카메라만 이동하므로 어드민 상대좌표 구조와 무관)
function defaultViewport(rootAbs: { x: number; y: number }): Viewport {
  const scale = designScale()
  const W = typeof window !== 'undefined' ? window.innerWidth : DESIGN_W
  const screenX = W / 2 + (ROOT_DESIGN_X - DESIGN_W / 2) * scale
  const screenY = ROOT_DESIGN_Y * scale
  return { x: screenX - rootAbs.x * scale, y: screenY - rootAbs.y * scale, zoom: scale }
}

// 어드민과 동일한 로직: root는 절대좌표, child는 부모로부터의 상대좌표로 저장됨
function computeAbsPositions(nodes: ApiNode[]): Map<number, { x: number; y: number }> {
  const map = new Map<number, { x: number; y: number }>()
  function getAbs(id: number): { x: number; y: number } {
    if (map.has(id)) return map.get(id)!
    const node = nodes.find((n) => n.id === id)
    if (!node) return { x: 0, y: 0 }
    if (node.parent_id === null) {
      const pos = { x: node.pos_x ?? 0, y: node.pos_y ?? 0 }
      map.set(id, pos)
      return pos
    }
    const parentAbs = getAbs(node.parent_id)
    const pos = { x: parentAbs.x + (node.pos_x ?? 0), y: parentAbs.y + (node.pos_y ?? 0) }
    map.set(id, pos)
    return pos
  }
  nodes.forEach((n) => getAbs(n.id))
  return map
}

interface ApiNode {
  id: number
  parent_id: number | null
  title: string
  node_kind: string | null
  pos_x: number
  pos_y: number
  is_locked: boolean
  price: number | null
  index_items?: string[]
  index_count?: number
  read_count?: number
}

export interface ContentNodeInfo {
  nodeId: number
  title: string
  isUnlocked: boolean
  price: number | null
}

interface TreeCanvasProps {
  themeId: string
  isLoggedIn?: boolean
  rootLabel?: string
  onLoginClick?: () => void
  onCenterClick?: () => void
  onOpenShop?: () => void
  onContentNodeClick?: (info: ContentNodeInfo) => void
  sessionUnlockedIds?: Set<number>
  // 해금 진행률(%) 보고 — 회원정보 PROGRESS 표시용
  onProgress?: (percent: number) => void
}

// 외부(로고/회원정보 버튼)에서 그래프 화면을 제어하기 위한 핸들
export interface TreeCanvasHandle {
  resetView: () => void
  centerOnNode: (nodeId: number) => void
  refreshNodeProgress: (nodeId: number) => void
}

export const TreeCanvas = forwardRef<TreeCanvasHandle, TreeCanvasProps>(function TreeCanvas(
  { isLoggedIn, rootLabel, onLoginClick, onCenterClick, onContentNodeClick, sessionUnlockedIds, onProgress },
  ref,
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { setViewport, setCenter, getNode, getZoom } = useReactFlow()
  const rootIdRef = useRef<string | null>(null)
  // 루트의 절대 flow 좌표 — 기본 화면/로고 리셋 시 루트를 디자인 좌표에 고정 배치하는 기준
  const rootAbsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  // 엣지 스타일을 세션 해금 시 다시 계산하기 위해 원본 노드/해금셋 보관
  const apiNodesRef = useRef<ApiNode[]>([])
  const baseUnlockedRef = useRef<Set<number>>(new Set())
  // 줌아웃 시 별자리 모드(회색 노드/엣지 숨김) — 디테일은 Context로 노드에, 엣지는 CSS로 처리
  const [zoomedOut, setZoomedOut] = useState(false)

  useEffect(() => {
    async function loadNodes() {
      try {
        const res = await fetch('/api/nodes/map')
        if (!res.ok) return
        const { nodes: apiNodes, unlocked_ids }: {
          nodes: ApiNode[]
          unlocked_ids: number[]
        } = await res.json()
        const unlockedSet = new Set(unlocked_ids)
        apiNodesRef.current = apiNodes
        baseUnlockedRef.current = unlockedSet

        const adminRoot = apiNodes.find(isRootNode)
        rootIdRef.current = adminRoot ? String(adminRoot.id) : null

        const absPositions = computeAbsPositions(apiNodes)
        rootAbsRef.current = adminRoot ? absPositions.get(adminRoot.id) ?? { x: 0, y: 0 } : { x: 0, y: 0 }

        const flowNodes: Node[] = apiNodes.map((n) => {
          const isRoot = isRootNode(n)
          const pos = absPositions.get(n.id) ?? { x: n.pos_x, y: n.pos_y }
          return {
            id: String(n.id),
            type: 'dot' as const,
            position: { x: pos.x, y: pos.y },
            data: isRoot
              ? {
                  isRoot: true,
                  isLoggedIn,
                  label: isLoggedIn ? rootLabel ?? '' : 'LOG IN',
                }
              : {
                  label: n.title,
                  isUnlocked: isLoggedIn ? !n.is_locked || unlockedSet.has(n.id) : false,
                  price: n.price,
                  indexItems: n.index_items ?? [],
                  indexCount: n.index_count ?? (n.index_items?.length ?? 0),
                  readCount: n.read_count ?? 0,
                },
            draggable: false,
          }
        })

        // parent_id 관계 그대로 — id는 어드민 노드 id를 그대로 사용.
        // 양끝이 모두 열람 상태면 굵은 흰 선(EDGE_ACTIVE), 아니면 dim.
        const byId = new Map(apiNodes.map((n) => [n.id, n]))
        const flowEdges: Edge[] = apiNodes
          .filter((n) => n.parent_id !== null)
          .map((n) => {
            const parent = byId.get(n.parent_id!)
            const active =
              !!parent &&
              isNodeUnlocked(parent, !!isLoggedIn, unlockedSet) &&
              isNodeUnlocked(n, !!isLoggedIn, unlockedSet)
            return {
              id: `e-${n.parent_id}-${n.id}`,
              type: 'straight',
              source: String(n.parent_id),
              target: String(n.id),
              style: active ? EDGE_ACTIVE : EDGE_DIM,
              // 회색(미열람) 엣지는 줌아웃 시 CSS로 숨겨 별자리만 남긴다
              className: active ? 'rf-active-edge' : 'rf-dim-edge',
            }
          })

        setNodes(flowNodes)
        setEdges(flowEdges)
        onProgress?.(computeProgress(apiNodes, !!isLoggedIn, unlockedSet))

        // 루트를 디자인 좌표에 고정해 기본 화면 구성 (어드민 viewport 대신, DB 좌표는 불변)
        setTimeout(() => {
          setViewport(defaultViewport(rootAbsRef.current), { duration: 0 })
        }, 50)
      } catch (e) {
        console.error('노드 로드 실패', e)
      }
    }

    loadNodes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, rootLabel, setNodes, setEdges, setViewport])

  // 세션 중 해금된 노드의 시각 상태를 즉시 업데이트 (흰 점 + 연결선 굵게)
  useEffect(() => {
    if (!sessionUnlockedIds || sessionUnlockedIds.size === 0) return
    const combined = new Set<number>([...baseUnlockedRef.current, ...sessionUnlockedIds])

    setNodes((prev) =>
      prev.map((n) => {
        if (n.data.isRoot) return n
        const nodeId = Number(n.id)
        if (sessionUnlockedIds.has(nodeId) && !n.data.isUnlocked) {
          return { ...n, data: { ...n.data, isUnlocked: true } }
        }
        return n
      }),
    )

    // 양끝이 모두 열람 상태가 된 간선은 굵은 흰 선으로 갱신
    const byId = new Map(apiNodesRef.current.map((n) => [n.id, n]))
    setEdges((prev) =>
      prev.map((e) => {
        const parent = byId.get(Number(e.source))
        const child = byId.get(Number(e.target))
        const active =
          !!parent &&
          !!child &&
          isNodeUnlocked(parent, !!isLoggedIn, combined) &&
          isNodeUnlocked(child, !!isLoggedIn, combined)
        return {
          ...e,
          style: active ? EDGE_ACTIVE : EDGE_DIM,
          className: active ? 'rf-active-edge' : 'rf-dim-edge',
        }
      }),
    )

    onProgress?.(computeProgress(apiNodesRef.current, !!isLoggedIn, combined))
  }, [sessionUnlockedIds, isLoggedIn, setNodes, setEdges, onProgress])

  // 로고 클릭: 어드민 초기 viewport로 복귀 / 회원정보 버튼: 특정 노드를 중앙으로
  useImperativeHandle(
    ref,
    () => ({
      resetView: () => {
        setViewport(defaultViewport(rootAbsRef.current), { duration: 600 })
      },
      centerOnNode: (nodeId: number) => {
        const node = getNode(String(nodeId))
        if (!node) return
        setCenter(node.position.x, node.position.y, { zoom: getZoom(), duration: 600 })
      },
      // 노드 열람 후 읽은 목차 수만 갱신 (뷰포트는 건드리지 않음)
      refreshNodeProgress: async (nodeId: number) => {
        try {
          const res = await fetch(`/api/nodes/progress?id=${nodeId}`)
          if (!res.ok) return
          const { read_items } = (await res.json()) as { read_items: string[] }
          const readCount = Array.isArray(read_items) ? read_items.length : 0
          setNodes((prev) =>
            prev.map((n) =>
              n.id === String(nodeId) ? { ...n, data: { ...n.data, readCount } } : n,
            ),
          )
        } catch {
          /* 무시 */
        }
      },
    }),
    [setViewport, setCenter, getNode, getZoom, setNodes],
  )

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (node.id === rootIdRef.current) {
        if (!isLoggedIn) onLoginClick?.()
        else onCenterClick?.()
        return
      }
      // 콘텐츠 노드: 로그인 상태일 때만 반응
      if (isLoggedIn) {
        onContentNodeClick?.({
          nodeId: Number(node.id),
          title: node.data.label as string,
          isUnlocked: node.data.isUnlocked as boolean,
          price: node.data.price as number | null,
        })
      }
    },
    [isLoggedIn, onLoginClick, onCenterClick, onContentNodeClick],
  )

  // 줌이 기본 프레이밍 줌의 일정 비율 아래로 내려가면 별자리 모드 진입
  const handleMove = useCallback((_: unknown, vp: Viewport) => {
    const refZoom = designScale()
    const out = vp.zoom < refZoom * DETAIL_ZOOM_FACTOR
    setZoomedOut((prev) => (prev === out ? prev : out))
  }, [])

  return (
    <DetailVisibleContext.Provider value={!zoomedOut}>
      <div className={`relative z-10 h-full w-full ${zoomedOut ? 'tree-zoomed-out' : ''}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onMove={handleMove}
          nodeTypes={nodeTypes}
          nodeOrigin={[0.5, 0.5]}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          minZoom={0.2}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
          style={{ background: 'transparent' }}
        />
      </div>
    </DetailVisibleContext.Provider>
  )
})
