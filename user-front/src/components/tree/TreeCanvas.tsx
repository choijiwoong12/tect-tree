'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { DotNode } from './DotNode'

const nodeTypes = { dot: DotNode }

const EDGE_STYLE = { stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1 }

function isRootNode(n: ApiNode) {
  return n.node_kind === 'root' || n.title === 'Root'
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
}

interface TreeCanvasProps {
  themeId: string
  isLoggedIn?: boolean
  rootLabel?: string
  onLoginClick?: () => void
  onCenterClick?: () => void
  onOpenShop?: () => void
}

export function TreeCanvas({ isLoggedIn, rootLabel, onLoginClick, onCenterClick }: TreeCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { setViewport } = useReactFlow()
  const rootIdRef = useRef<string | null>(null)

  useEffect(() => {
    async function loadNodes() {
      try {
        const res = await fetch('/api/nodes/map')
        if (!res.ok) return
        const { nodes: apiNodes, unlocked_ids, viewport }: {
          nodes: ApiNode[]
          unlocked_ids: number[]
          viewport: { x: number; y: number; zoom: number }
        } = await res.json()
        const unlockedSet = new Set(unlocked_ids)

        const adminRoot = apiNodes.find(isRootNode)
        rootIdRef.current = adminRoot ? String(adminRoot.id) : null

        const absPositions = computeAbsPositions(apiNodes)

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
                },
            draggable: false,
          }
        })

        // parent_id 관계 그대로 — id는 어드민 노드 id를 그대로 사용.
        const flowEdges: Edge[] = apiNodes
          .filter((n) => n.parent_id !== null)
          .map((n) => ({
            id: `e-${n.parent_id}-${n.id}`,
            type: 'straight',
            source: String(n.parent_id),
            target: String(n.id),
            style: EDGE_STYLE,
          }))

        setNodes(flowNodes)
        setEdges(flowEdges)

        // 어드민이 저장한 viewport 그대로 적용
        setTimeout(() => {
          setViewport({ x: viewport.x, y: viewport.y, zoom: viewport.zoom }, { duration: 0 })
        }, 50)
      } catch (e) {
        console.error('노드 로드 실패', e)
      }
    }

    loadNodes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, rootLabel, setNodes, setEdges, setViewport])

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (node.id !== rootIdRef.current) return
      if (!isLoggedIn) onLoginClick?.()
      else onCenterClick?.()
    },
    [isLoggedIn, onLoginClick, onCenterClick],
  )

  return (
    <div className="relative z-10 h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
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
  )
}
