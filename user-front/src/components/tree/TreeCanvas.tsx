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

// 줌이 기본 프레이밍 줌의 이 비율 아래로 내려가면 별자리 모드(회색 노드는 별, 회색 엣지 숨김)
const DETAIL_ZOOM_FACTOR = 0.55

const EDGE_DIM = { stroke: '#404040', strokeWidth: 1 }
const EDGE_ACTIVE = { stroke: '#ffffff', strokeWidth: 2 }

function isRootNode(n: ApiNode) {
  return n.node_kind === 'root' || n.title === 'Root'
}

// 접근 가능 여부(클릭 시 바로 열림 vs 해금모달) — 루트 항상, 그 외 로그인 + (무료거나 해금됨)
function isNodeAccessible(n: ApiNode, isLoggedIn: boolean, accessible: Set<number>): boolean {
  if (isRootNode(n)) return true
  if (!isLoggedIn) return false
  return !n.is_locked || accessible.has(n.id)
}

// 시각상 '열람한(흰색·큰)' 상태인지 — 루트 항상, 그 외 로그인 + 실제로 열어본 노드
function isNodeViewed(n: ApiNode, isLoggedIn: boolean, viewed: Set<number>): boolean {
  if (isRootNode(n)) return true
  if (!isLoggedIn) return false
  return viewed.has(n.id)
}

// 진행률(%) = 열람한 콘텐츠 노드 수 / 전체 콘텐츠 노드 수 (루트 제외)
function computeProgress(nodes: ApiNode[], isLoggedIn: boolean, viewed: Set<number>): number {
  const content = nodes.filter((n) => !isRootNode(n))
  if (content.length === 0) return 0
  const open = content.filter((n) => isNodeViewed(n, isLoggedIn, viewed)).length
  return (open / content.length) * 100
}

// 디자인 프레임(1920×1080) — 헤더/정보패널(DesignOverlay)과 동일 좌표계. 루트를 Figma 좌표에 고정.
const DESIGN_W = 1920
const DESIGN_H = 1080
const ROOT_DESIGN_X = 627
const ROOT_DESIGN_Y = 718

function designScale(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
}

function defaultViewport(rootAbs: { x: number; y: number }): Viewport {
  const scale = designScale()
  const W = typeof window !== 'undefined' ? window.innerWidth : DESIGN_W
  const screenX = W / 2 + (ROOT_DESIGN_X - DESIGN_W / 2) * scale
  const screenY = ROOT_DESIGN_Y * scale
  return { x: screenX - rootAbs.x * scale, y: screenY - rootAbs.y * scale, zoom: scale }
}

// 어드민이 절대좌표로 저장하므로 pos_x/pos_y를 직접 사용
function getAbsPositions(nodes: ApiNode[]): Map<number, { x: number; y: number }> {
  const map = new Map<number, { x: number; y: number }>()
  for (const n of nodes) {
    map.set(n.id, { x: n.pos_x ?? 0, y: n.pos_y ?? 0 })
  }
  return map
}

interface ApiNode {
  id: number
  parent_id?: number | null
  title: string
  node_kind: string | null
  pos_x: number
  pos_y: number
  is_locked: boolean
  price: number | null
  index_items?: string[]
  index_count?: number
  read_count?: number
  is_adjacent_to_unlocked?: boolean
}

interface ApiEdge {
  source: number
  target: number
}

export interface ContentNodeInfo {
  nodeId: number
  title: string
  isUnlocked: boolean // 접근 가능(무료/구매/구독) — 클릭 시 바로 열림 vs 해금모달
  isUnlockable: boolean // 해금 가능(이미 해금된 노드와 인접)
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
  // 이번 세션에 새로 '열어본' 노드 — 즉시 흰색/큰 노드로 반영
  sessionViewedIds?: Set<number>
  // 진행률(%) 보고 — 회원정보 PROGRESS 표시용
  onProgress?: (percent: number) => void
}

export interface TreeCanvasHandle {
  resetView: () => void
  centerOnNode: (nodeId: number) => void
  refreshNodeProgress: (nodeId: number) => void
}

// 인접 맵(무방향) 생성
function buildAdjacency(edges: ApiEdge[]): Map<number, number[]> {
  const adjacency = new Map<number, number[]>()
  for (const e of edges) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, [])
    if (!adjacency.has(e.target)) adjacency.set(e.target, [])
    adjacency.get(e.source)!.push(e.target)
    adjacency.get(e.target)!.push(e.source)
  }
  return adjacency
}

export const TreeCanvas = forwardRef<TreeCanvasHandle, TreeCanvasProps>(function TreeCanvas(
  { isLoggedIn, rootLabel, onLoginClick, onCenterClick, onContentNodeClick, sessionViewedIds, onProgress },
  ref,
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { setViewport, setCenter, getNode, getZoom } = useReactFlow()
  const rootIdRef = useRef<string | null>(null)
  const rootAbsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  // 세션 중 열람/해금 시 엣지·시각·게이팅 재계산을 위해 원본 보관
  const apiNodesRef = useRef<ApiNode[]>([])
  const apiEdgesRef = useRef<ApiEdge[]>([])
  const baseViewedRef = useRef<Set<number>>(new Set())
  const baseAccessibleRef = useRef<Set<number>>(new Set())
  // 줌아웃 시 별자리 모드 — 디테일은 Context로 노드에, 회색 엣지는 CSS로 숨김
  const [zoomedOut, setZoomedOut] = useState(false)

  useEffect(() => {
    async function loadNodes() {
      try {
        const res = await fetch('/api/nodes/map')
        if (!res.ok) return
        const { nodes: apiNodes, unlocked_ids, viewed_ids, edges: apiEdges }: {
          nodes: ApiNode[]
          unlocked_ids: number[]
          viewed_ids?: number[]
          edges?: ApiEdge[]
        } = await res.json()
        const accessibleSet = new Set(unlocked_ids)
        const viewedSet = new Set(viewed_ids ?? [])
        apiNodesRef.current = apiNodes
        apiEdgesRef.current = apiEdges ?? []
        baseViewedRef.current = viewedSet
        baseAccessibleRef.current = accessibleSet

        const adminRoot = apiNodes.find(isRootNode)
        rootIdRef.current = adminRoot ? String(adminRoot.id) : null

        const absPositions = getAbsPositions(apiNodes)
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
                  // 시각: 열어본 적 있으면 흰/큰. 클릭용 접근권은 isAccessible. 해금가능은 인접 게이팅.
                  isViewed: isNodeViewed(n, !!isLoggedIn, viewedSet),
                  isAccessible: isNodeAccessible(n, !!isLoggedIn, accessibleSet),
                  isUnlockable: isLoggedIn ? (n.is_adjacent_to_unlocked ?? false) : false,
                  price: n.price,
                  indexItems: n.index_items ?? [],
                  indexCount: n.index_count ?? (n.index_items?.length ?? 0),
                  readCount: n.read_count ?? 0,
                },
            draggable: false,
            // 노드(동그라미+제목+목차) 그룹을 엣지 위로 올려 선이 글씨를 가리지 않게
            zIndex: 10,
          }
        })

        // node_edges 기반 엣지 — 양끝이 모두 '열람한' 노드면 굵은 흰 선, 아니면 dim(줌아웃 시 CSS로 숨김)
        const byId = new Map(apiNodes.map((n) => [n.id, n]))
        const flowEdges: Edge[] = (apiEdges ?? []).map((e) => {
          const src = byId.get(e.source)
          const tgt = byId.get(e.target)
          const active =
            !!src &&
            !!tgt &&
            isNodeViewed(src, !!isLoggedIn, viewedSet) &&
            isNodeViewed(tgt, !!isLoggedIn, viewedSet)
          return {
            id: `e-${e.source}-${e.target}`,
            type: 'straight',
            source: String(e.source),
            target: String(e.target),
            style: active ? EDGE_ACTIVE : EDGE_DIM,
            className: active ? 'rf-active-edge' : 'rf-dim-edge',
          }
        })

        setNodes(flowNodes)
        setEdges(flowEdges)
        onProgress?.(computeProgress(apiNodes, !!isLoggedIn, viewedSet))

        // 루트를 디자인 좌표에 고정해 기본 화면 구성 (DB 좌표는 불변)
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

  // 세션 중 새로 열어본/해금된 노드 즉시 반영: 시각(흰 큰 노드)·엣지·인접 해금게이팅·진행률
  useEffect(() => {
    if (!sessionViewedIds || sessionViewedIds.size === 0) return
    const viewedCombined = new Set<number>([...baseViewedRef.current, ...sessionViewedIds])
    // 열람한 노드는 모두 접근 가능하므로, base 접근권 ∪ 세션열람 = 현재 접근가능 집합
    const accessibleCombined = new Set<number>([...baseAccessibleRef.current, ...sessionViewedIds])
    const byId = new Map(apiNodesRef.current.map((n) => [n.id, n]))
    const adjacency = buildAdjacency(apiEdgesRef.current)

    setNodes((prev) =>
      prev.map((n) => {
        if (n.data.isRoot) return n
        const apiNode = byId.get(Number(n.id))
        if (!apiNode) return n
        const viewed = isNodeViewed(apiNode, !!isLoggedIn, viewedCombined)
        const accessible = isNodeAccessible(apiNode, !!isLoggedIn, accessibleCombined)
        const neighbors = adjacency.get(apiNode.id) ?? []
        const unlockable = neighbors.some((nid) => {
          const nb = byId.get(nid)
          return !!nb && isNodeAccessible(nb, !!isLoggedIn, accessibleCombined)
        })
        if (
          viewed === n.data.isViewed &&
          accessible === n.data.isAccessible &&
          unlockable === n.data.isUnlockable
        ) {
          return n
        }
        return { ...n, data: { ...n.data, isViewed: viewed, isAccessible: accessible, isUnlockable: unlockable } }
      }),
    )

    // 양끝이 모두 '열람한' 노드가 된 간선은 굵은 흰 선으로 갱신
    setEdges((prev) =>
      prev.map((e) => {
        const src = byId.get(Number(e.source))
        const tgt = byId.get(Number(e.target))
        const active =
          !!src &&
          !!tgt &&
          isNodeViewed(src, !!isLoggedIn, viewedCombined) &&
          isNodeViewed(tgt, !!isLoggedIn, viewedCombined)
        return {
          ...e,
          style: active ? EDGE_ACTIVE : EDGE_DIM,
          className: active ? 'rf-active-edge' : 'rf-dim-edge',
        }
      }),
    )

    onProgress?.(computeProgress(apiNodesRef.current, !!isLoggedIn, viewedCombined))
  }, [sessionViewedIds, isLoggedIn, setNodes, setEdges, onProgress])

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
      if (isLoggedIn) {
        onContentNodeClick?.({
          nodeId: Number(node.id),
          title: node.data.label as string,
          // isUnlocked = 접근권(바로 열림 vs 해금모달). 시각 isViewed와 별개.
          isUnlocked: node.data.isAccessible as boolean,
          isUnlockable: node.data.isUnlockable as boolean,
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
          minZoom={0.05}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
          style={{ background: 'transparent' }}
        />
      </div>
    </DetailVisibleContext.Provider>
  )
})
