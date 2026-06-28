"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useNodesInitialized,
  ReactFlowProvider,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ZoomIn, ZoomOut, Maximize2, Info, Search, X } from "lucide-react";
import clsx from "clsx";
import type { DocumentNode } from "@/lib/types";
import { fetchGraphViewport, saveGraphViewport } from "@/lib/supabase";

// ─── types ───────────────────────────────────────────────────────────────────

type NodeData = { docNode: DocumentNode };

// ─── helpers ─────────────────────────────────────────────────────────────────

function computeAbsPositions(nodes: DocumentNode[]): Map<number, { x: number; y: number }> {
  const map = new Map<number, { x: number; y: number }>();
  function getAbs(id: number): { x: number; y: number } {
    if (map.has(id)) return map.get(id)!;
    const node = nodes.find((n) => n.id === id);
    if (!node) return { x: 0, y: 0 };
    if (node.parent_id === null) {
      const pos = { x: node.pos_x ?? 0, y: node.pos_y ?? 0 };
      map.set(id, pos);
      return pos;
    }
    const parentAbs = getAbs(node.parent_id);
    const pos = { x: parentAbs.x + (node.pos_x ?? 0), y: parentAbs.y + (node.pos_y ?? 0) };
    map.set(id, pos);
    return pos;
  }
  nodes.forEach((n) => getAbs(n.id));
  return map;
}

function nodeColor(kind: string) {
  switch (kind) {
    case "category": return { fill: "#7c3aed", stroke: "#c4b5fd" };
    case "file":     return { fill: "#059669", stroke: "#6ee7b7" };
    default:         return { fill: "#2563eb", stroke: "#93c5fd" };
  }
}

// ─── custom node ─────────────────────────────────────────────────────────────

function GraphNodeComponent({ data, selected }: NodeProps) {
  const { docNode } = data as NodeData;
  const r = docNode.parent_id === null ? 10 : 7;
  const { fill, stroke } = nodeColor(docNode.node_kind);

  return (
    <div style={{ width: r * 2, height: r * 2, position: "relative" }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
      />
      <svg width={r * 2} height={r * 2} style={{ overflow: "visible", display: "block" }}>
        <circle
          cx={r} cy={r} r={r}
          fill={selected ? "#ef4444" : fill}
          stroke={selected ? "#dc2626" : stroke}
          strokeWidth={selected ? 2.5 : 1}
        />
      </svg>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, left: "50%", bottom: "auto", top: "50%", transform: "translate(-50%,-50%)" }}
      />
      <div style={{
        position: "absolute",
        top: r * 2 + 4,
        left: "50%",
        transform: "translateX(-50%)",
        whiteSpace: "nowrap",
        fontSize: 11,
        fontFamily: "monospace",
        color: selected ? "#ef4444" : "#6b7280",
        pointerEvents: "none",
      }}>
        {docNode.title}
      </div>
    </div>
  );
}

const nodeTypes = { graphNode: GraphNodeComponent };

// ─── props ───────────────────────────────────────────────────────────────────

interface Props {
  nodes: DocumentNode[];
  onSelectNode: (node: DocumentNode) => void;
}

// ─── inner (uses useReactFlow) ────────────────────────────────────────────────

function GraphViewInner({ nodes, onSelectNode }: Props) {
  const { setViewport, setCenter, zoomIn, zoomOut } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const centerDone = useRef(false);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedDocNode, setSelectedDocNode] = useState<DocumentNode | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const abs = computeAbsPositions(nodes);
    setRfNodes(nodes.map((n): Node<NodeData> => ({
      id: String(n.id),
      position: abs.get(n.id) ?? { x: 0, y: 0 },
      data: { docNode: n },
      type: "graphNode",
      draggable: false,
    })));
    setRfEdges(nodes
      .filter((n) => n.parent_id !== null)
      .map((n): Edge => ({
        id: `e-${n.parent_id}-${n.id}`,
        source: String(n.parent_id!),
        target: String(n.id),
        type: "straight",
        style: { stroke: "#cbd5e1", strokeWidth: 1 },
      }))
    );
  }, [nodes, setRfNodes, setRfEdges]);

  useEffect(() => {
    if (!nodesInitialized || centerDone.current || nodes.length === 0) return;
    const roots = nodes.filter((n) => n.parent_id === null);
    if (roots.length === 0) return;
    const abs = computeAbsPositions(nodes);
    const positions = roots.map((n) => abs.get(n.id)).filter((p): p is { x: number; y: number } => !!p);
    if (positions.length === 0) return;
    const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
    setCenter(cx, cy, { zoom: 1 });
    centerDone.current = true;
  }, [nodesInitialized, nodes, setCenter]);

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  const handleMoveEnd = useCallback((_: MouseEvent | TouchEvent | null, vp: Viewport) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveGraphViewport(vp), 600);
  }, []);

  function centerOnNode(docNode: DocumentNode) {
    const abs = computeAbsPositions(nodes).get(docNode.id);
    if (!abs) return;
    setViewport({ x: -abs.x, y: -abs.y, zoom: 1 });
    setSelectedDocNode(docNode);
  }

  function resetView() {
    const vp = { x: 0, y: 0, zoom: 1 };
    setViewport(vp);
    saveGraphViewport(vp);
  }

  const allZero = nodes.every((n) => !n.pos_x && !n.pos_y);
  const searchResults = searchQuery.trim()
    ? nodes.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F5F7FA] relative overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        <CtrlBtn onClick={() => zoomIn()} title="확대"><ZoomIn size={14} /></CtrlBtn>
        <CtrlBtn onClick={() => zoomOut()} title="축소"><ZoomOut size={14} /></CtrlBtn>
        <CtrlBtn onClick={resetView} title="초기화"><Maximize2 size={14} /></CtrlBtn>
        <CtrlBtn onClick={() => { setShowSearch(v => !v); setSearchQuery(""); }} title="검색">
          <Search size={14} />
        </CtrlBtn>
      </div>

      {/* Search panel */}
      {showSearch && (
        <div className="absolute top-4 right-16 z-20 w-64">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef} type="text" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
              placeholder="노드 제목 검색..."
              className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={11} />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
              {searchResults.map((node) => (
                <button key={node.id}
                  onClick={() => { centerOnNode(node); setSearchQuery(""); setShowSearch(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                  <span className={clsx("shrink-0 w-1.5 h-1.5 rounded-full",
                    node.node_kind === "category" ? "bg-violet-500"
                    : node.node_kind === "file" ? "bg-emerald-500" : "bg-blue-500")} />
                  <span className="flex-1 text-xs text-gray-800 truncate">{node.title}</span>
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">
                    ({Math.round(node.pos_x ?? 0)}, {Math.round(node.pos_y ?? 0)})
                  </span>
                </button>
              ))}
            </div>
          )}
          {searchQuery.trim() && searchResults.length === 0 && (
            <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-md px-3 py-2.5">
              <p className="text-xs text-gray-400">검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {allZero && nodes.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-400 shadow-sm">
          <Info size={12} />
          노드에 위치 정보가 없습니다. 노드 관리에서 위치를 설정하세요.
        </div>
      )}

      {/* ReactFlow canvas */}
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodeOrigin={[0.5, 0.5]}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={(_, node) => {
          const docNode = nodes.find((n) => String(n.id) === node.id);
          if (docNode) setSelectedDocNode(docNode);
        }}
        onPaneClick={() => setSelectedDocNode(null)}
        onMoveEnd={handleMoveEnd}
        fitView={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#F5F7FA", flex: 1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={40} size={1.5} color="#d1d5db" />
      </ReactFlow>

      {/* Selected node info panel */}
      {selectedDocNode && (
        <div className="absolute bottom-4 left-4 z-20 bg-white border border-gray-200 rounded-xl p-4 w-64 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">#{selectedDocNode.id}</span>
            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-medium",
              selectedDocNode.node_kind === "category" ? "bg-violet-100 text-violet-700"
              : selectedDocNode.node_kind === "file" ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700")}>
              {selectedDocNode.node_kind === "category" ? "카테고리"
              : selectedDocNode.node_kind === "file" ? "파일" : "문서"}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{selectedDocNode.title}</p>
          {selectedDocNode.pos_x !== null && (
            <p className="text-[10px] text-gray-400 font-mono">
              pos ({Math.round(selectedDocNode.pos_x ?? 0)}, {Math.round(selectedDocNode.pos_y ?? 0)})
            </p>
          )}
          <button
            onClick={() => onSelectNode(selectedDocNode)}
            className="w-full mt-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 transition-colors border border-gray-200"
          >
            노드 관리에서 열기 →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── exported component ───────────────────────────────────────────────────────

export default function GraphView(props: Props) {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
}

function CtrlBtn({ onClick, title, children }: {
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-700 border border-gray-200 shadow-sm transition-colors">
      {children}
    </button>
  );
}
