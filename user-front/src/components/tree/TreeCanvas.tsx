'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAppStore } from '@/store/useAppStore'
import { DotNode } from './DotNode'
import { UnlockModal } from './UnlockModal'
import { DocumentViewer } from './DocumentViewer'
import { nodeSpecs, links, ROOT_ID, computeRadialLayout } from './treeGraph'

const nodeTypes = { dot: DotNode }

// Positions are derived from the graph (see treeGraph.ts) so the tree stays
// aligned and new nodes automatically branch out from their parent.
const layout = computeRadialLayout(
  nodeSpecs.map((s) => s.id),
  links,
  ROOT_ID,
)

const initialNodes: Node[] = nodeSpecs.map((spec) => ({
  id: spec.id,
  type: 'dot',
  position: layout.get(spec.id) ?? { x: 0, y: 0 },
  data: { label: spec.label, status: spec.status, ...(spec.cost != null ? { cost: spec.cost } : {}) },
}))

const initialEdges: Edge[] = links.map((l) => ({
  id: `e${l.source}-${l.target}`,
  source: l.source,
  target: l.target,
}))

interface TreeCanvasProps {
  themeId: string
  isLoggedIn?: boolean
  onLoginClick?: () => void
  onFocusChange?: (label: string) => void
  onCenterClick?: () => void
  onOpenShop?: () => void
}

export function TreeCanvas({ isLoggedIn, onLoginClick, onFocusChange, onCenterClick, onOpenShop }: TreeCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)
  const { rpBalance, setRpBalance, recentNodeId, setRecentNodeId } = useAppStore()
  const { fitView, setCenter } = useReactFlow()
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  useEffect(() => {
    setTimeout(() => {
      // On initial load (no recent node) jump straight to the final framing with
      // no camera animation, so the graph just fades in at its final zoom instead
      // of zooming in/out. Only animate when focusing a freshly-unlocked node.
      const duration = recentNodeId ? 800 : 0
      const targetId = recentNodeId || '1'
      const targetNode = nodes.find(n => n.id === targetId)
      if (targetNode) {
        setCenter(targetNode.position.x + 10, targetNode.position.y + 10, { zoom: 0.85, duration })
      } else {
        fitView({ duration, padding: 0.2 })
      }
    }, 100)
  }, [recentNodeId, nodes, setCenter, fitView])

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!isLoggedIn && node.id === '1' && onLoginClick) {
      onLoginClick()
      return
    }
    if (!isLoggedIn) return
    if (node.id === '1') {
      // 로그인 후 중앙(콜사인) 노드 클릭 → 좌하단 자기정보 토글
      onCenterClick?.()
      return
    }
    if (node.data.status === 'locked') return
    setSelectedNode(node)
    if (onFocusChange) onFocusChange((node.data.label as string).replace(/\n/g, ' '))
  }, [isLoggedIn, onLoginClick, onFocusChange, onCenterClick])

  const handleUnlock = () => {
    if (!selectedNode) return
    const cost = (selectedNode.data.cost as number) || 0
    if (rpBalance < cost) return

    setRpBalance(rpBalance - cost)
    setNodes(nds => nds.map(n => {
      if (n.id === selectedNode.id) {
        return { ...n, data: { ...n.data, status: 'unlocked' } }
      }
      const childrenIds = edges.filter(e => e.source === selectedNode.id).map(e => e.target)
      if (childrenIds.includes(n.id) && n.data.status === 'locked') {
        return { ...n, data: { ...n.data, status: 'unlockable', cost: 1500 } }
      }
      return n
    }))

    setRecentNodeId(selectedNode.id)
    setSelectedNode(null)
  }

  const decoratedNodes = nodes.map(n => {
    if (!isLoggedIn) {
      if (n.id === '1') {
        return { ...n, data: { ...n.data, label: 'LOG IN', isLoginNode: true, status: 'unlocked' } }
      }
      // Hide all other node labels and force them into locked appearance
      return { ...n, data: { ...n.data, label: '???', isLoginNode: false, status: 'locked' } }
    }
    return { ...n, data: { ...n.data, isLoginNode: false } }
  })

  const decoratedEdges = edges.map(e => ({
    ...e,
    type: 'straight',
    animated: false,
    style: { stroke: 'rgba(255,255,255,0.45)', strokeWidth: 1 },
  }))

  return (
    <div className="relative z-10 w-full h-full">
      <ReactFlow
        nodes={decoratedNodes}
        edges={decoratedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.4}
        maxZoom={3}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        style={{ background: 'transparent' }}
      >
      </ReactFlow>

      {selectedNode && selectedNode.data.status === 'unlockable' && (
        <UnlockModal
          label={(selectedNode.data.label as string).replace(/\n/g, ' ')}
          cost={(selectedNode.data.cost as number) || 0}
          rpBalance={rpBalance}
          onClose={() => setSelectedNode(null)}
          onUnlockRP={handleUnlock}
          onOpenShop={() => { setSelectedNode(null); onOpenShop?.() }}
        />
      )}

      {selectedNode && selectedNode.data.status === 'unlocked' && (
        <DocumentViewer
          label={(selectedNode.data.label as string).replace(/\n/g, ' ')}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
