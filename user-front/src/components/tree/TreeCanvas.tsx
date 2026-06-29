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

const DETAIL_ZOOM_FACTOR = 0.55

const EDGE_DIM = { stroke: '#404040', strokeWidth: 1 }
const EDGE_ACTIVE = { stroke: '#ffffff', strokeWidth: 2 }

function isRootNode(n: ApiNode) {
  return n.node_kind === 'root' || n.title === 'Root'
}

function isNodeUnlocked(n: ApiNode, isLoggedIn: boolean, unlocked: Set<number>): boolean {
  if (isRootNode(n)) return true
  if (!isLoggedIn) return false
  return !n.is_locked || unlocked.has(n.id)
}

function computeProgress(nodes: ApiNode[], isLoggedIn: boolean, unlocked: Set<number>): number {
  const content = nodes.filter((n) => !isRootNode(n))
  if (content.length === 0) return 0
  const open = content.filter((n) => isNodeUnlocked(n, isLoggedIn, unlocked)).length
  return (open / content.length) * 100
}

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
  isUnlocked: boolean
  isUnlockable: boolean
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
  onProgress?: (percent: number) => void
}

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
  const rootAbsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const apiNodesRef = useRef<ApiNode[]>([])
  const apiEdgesRef = useRef<ApiEdge[]>([])
  const baseUnlockedRef = useRef<Set<number>>(new Set())
  const [zoomedOut, setZoomedOut] = useState(false)

  useEffect(() => {
    async function loadNodes() {
      try {
        const res = await fetch('/api/nodes/map')
        if (!res.ok) return
        const { nodes: apiNodes, unlocked_ids, edges: apiEdges }: {
          nodes: ApiNode[]
          unlocked_ids: number[]
          edges: ApiEdge[]
        } = await res.json()
        const unlockedSet = new Set(unlocked_ids)
        apiNodesRef.current = apiNodes
        apiEdgesRef.current = apiEdges ?? []
        baseUnlockedRef.current = unlockedSet

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
                  isUnlocked: isLoggedIn ? !n.is_locked || unlockedSet.has(n.id) : false,
                  isUnlockable: isLoggedIn ? (n.is_adjacent_to_unlocked ?? false) : false,
                  price: n.price,
                  indexItems: n.index_items ?? [],
                  indexCount: n.index_count ?? (n.index_items?.length ?? 0),
                  readCount: n.read_count ?? 0,
                },
            draggable: false,
          }
        })

        // node_edges 기반 엣지 생성 — 양끝 모두 열람 상태면 흰 굵은 선
        const byId = new Map(apiNodes.map((n) => [n.id, n]))
        const flowEdges: Edge[] = (apiEdges ?? []).map((e) => {
          const src = byId.get(e.source)
          const tgt = byId.get(e.target)
          const active =
            !!src &&
            !!tgt &&
            isNodeUnlocked(src, !!isLoggedIn, unlockedSet) &&
            isNodeUnlocked(tgt, !!isLoggedIn, unlockedSet)
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
        onProgress?.(computeProgress(apiNodes, !!isLoggedIn, unlockedSet))

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

  // 세션 중 해금된 노드의 시각 상태 즉시 업데이트
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

    const byId = new Map(apiNodesRef.current.map((n) => [n.id, n]))
    setEdges((prev) =>
      prev.map((e) => {
        const src = byId.get(Number(e.source))
        const tgt = byId.get(Number(e.target))
        const active =
          !!src &&
          !!tgt &&
          isNodeUnlocked(src, !!isLoggedIn, combined) &&
          isNodeUnlocked(tgt, !!isLoggedIn, combined)
        return {
          ...e,
          style: active ? EDGE_ACTIVE : EDGE_DIM,
          className: active ? 'rf-active-edge' : 'rf-dim-edge',
        }
      }),
    )

    // 새로 해금된 노드에 인접한 노드들의 isUnlockable 업데이트
    const adjacencyMap = new Map<number, number[]>()
    for (const edge of apiEdgesRef.current) {
      if (!adjacencyMap.has(edge.source)) adjacencyMap.set(edge.source, [])
      if (!adjacencyMap.has(edge.target)) adjacencyMap.set(edge.target, [])
      adjacencyMap.get(edge.source)!.push(edge.target)
      adjacencyMap.get(edge.target)!.push(edge.source)
    }

    setNodes((prev) =>
      prev.map((n) => {
        if (n.data.isRoot || n.data.isUnlocked) return n
        const nodeId = Number(n.id)
        const neighbors = adjacencyMap.get(nodeId) ?? []
        const isUnlockable = neighbors.some((nid) => {
          const neighbor = byId.get(nid)
          return neighbor && isNodeUnlocked(neighbor, !!isLoggedIn, combined)
        })
        if (isUnlockable === n.data.isUnlockable) return n
        return { ...n, data: { ...n.data, isUnlockable } }
      }),
    )

    onProgress?.(computeProgress(apiNodesRef.current, !!isLoggedIn, combined))
  }, [sessionUnlockedIds, isLoggedIn, setNodes, setEdges, onProgress])

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
          isUnlocked: node.data.isUnlocked as boolean,
          isUnlockable: node.data.isUnlockable as boolean,
          price: node.data.price as number | null,
        })
      }
    },
    [isLoggedIn, onLoginClick, onCenterClick, onContentNodeClick],
  )

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
