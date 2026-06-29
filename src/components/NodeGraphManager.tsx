"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ZoomIn, ZoomOut, Maximize2, Plus, X, ArrowRight, Check, Search,
} from "lucide-react";
import clsx from "clsx";
import type { DocumentNode } from "@/lib/types";
import NodeDetail from "./NodeDetail";

// ─── helpers ─────────────────────────────────────────────────────────────────

function computeAbsPositions(nodes: DocumentNode[]) {
  const map = new Map<number, { x: number; y: number }>();
  function get(id: number): { x: number; y: number } {
    if (map.has(id)) return map.get(id)!;
    const n = nodes.find((n) => n.id === id);
    if (!n) return { x: 0, y: 0 };
    if (n.parent_id === null) {
      const pos = { x: n.pos_x ?? 0, y: n.pos_y ?? 0 };
      map.set(id, pos);
      return pos;
    }
    const p = get(n.parent_id);
    const pos = { x: p.x + (n.pos_x ?? 0), y: p.y + (n.pos_y ?? 0) };
    map.set(id, pos);
    return pos;
  }
  nodes.forEach((n) => get(n.id));
  return map;
}

function nodeColor(kind: string, isRoot: boolean) {
  if (isRoot) return { fill: "#b45309", stroke: "#fcd34d" };
  switch (kind) {
    case "category": return { fill: "#7c3aed", stroke: "#c4b5fd" };
    case "file":     return { fill: "#059669", stroke: "#6ee7b7" };
    default:         return { fill: "#2563eb", stroke: "#93c5fd" };
  }
}

// ─── context ─────────────────────────────────────────────────────────────────

interface GraphCtx {
  hoveredId: number | null;
  selectedId: number | null;
  editingId: number | null;
  pendingParentId: number | null;
  setHoveredId: (id: number | null) => void;
}

const GraphContext = createContext<GraphCtx>({
  hoveredId: null,
  selectedId: null,
  editingId: null,
  pendingParentId: null,
  setHoveredId: () => {},
});

// ─── custom nodes ─────────────────────────────────────────────────────────────

type DocNodeData = { docNode: DocumentNode };

function ManagerNodeComponent({ data }: NodeProps) {
  const { docNode } = data as DocNodeData;
  const { hoveredId, selectedId, editingId, pendingParentId, setHoveredId } = useContext(GraphContext);
  const isRoot = docNode.parent_id === null;
  const r = isRoot ? 12 : 7;
  const { fill, stroke } = nodeColor(docNode.node_kind, isRoot);
  const id = docNode.id;
  const isSelected   = selectedId === id || editingId === id;
  const isPending    = pendingParentId === id;
  const isHovered    = hoveredId === id;

  return (
    <div
      style={{ width: r * 2, height: r * 2, position: "relative", cursor: "pointer" }}
      onMouseEnter={() => setHoveredId(id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      <Handle type="target" position={Position.Top}
        style={{ opacity: 0, left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
      <svg width={r * 2} height={r * 2} style={{ overflow: "visible", display: "block" }}>
        {isRoot ? (
          <polygon
            points={`${r},0 ${r*2},${r} ${r},${r*2} 0,${r}`}
            fill={isSelected ? "#ef4444" : isPending ? "#f97316" : fill}
            stroke={isSelected ? "#dc2626" : isPending ? "#ea580c" : isHovered ? "#1e293b" : stroke}
            strokeWidth={isSelected || isPending ? 2.5 : isHovered ? 2 : 1.5}
          />
        ) : (
          <circle cx={r} cy={r} r={r}
            fill={isSelected ? "#ef4444" : isPending ? "#f97316" : fill}
            stroke={isSelected ? "#dc2626" : isPending ? "#ea580c" : isHovered ? "#1e293b" : stroke}
            strokeWidth={isSelected || isPending ? 2.5 : isHovered ? 2 : 1}
          />
        )}
      </svg>
      <Handle type="source" position={Position.Bottom}
        style={{ opacity: 0, left: "50%", bottom: "auto", top: "50%", transform: "translate(-50%,-50%)" }} />
      <div style={{
        position: "absolute", top: r * 2 + 4, left: "50%",
        transform: "translateX(-50%)", whiteSpace: "nowrap",
        fontSize: isRoot ? 12 : 11, fontFamily: "monospace", pointerEvents: "none",
        fontWeight: isRoot ? 700 : 400,
        color: isSelected ? "#ef4444" : isPending ? "#f97316"
          : isHovered ? "#111827" : isRoot ? "#92400e" : "#6b7280",
      }}>
        {docNode.title}
      </div>
    </div>
  );
}

function PendingNodeComponent() {
  return (
    <div style={{ width: 14, height: 14, position: "relative" }}>
      <Handle type="target" position={Position.Top}
        style={{ opacity: 0, left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
      <svg width={14} height={14} style={{ overflow: "visible", display: "block" }}>
        <circle cx={7} cy={7} r={7} fill="#3b82f6" stroke="#fff" strokeWidth={2.5} />
      </svg>
    </div>
  );
}

const nodeTypes = {
  managerNode: ManagerNodeComponent,
  pendingNode: PendingNodeComponent,
};

// ─── props ────────────────────────────────────────────────────────────────────

type CreationStep = "select-parent" | "placing" | "placed";

interface Props {
  nodes: DocumentNode[];
  saving: boolean;
  onCreateNode: (
    data: Partial<DocumentNode>,
    parentId: number | null,
    posX: number,
    posY: number
  ) => Promise<DocumentNode>;
  onUpdateNode: (id: number, data: Partial<DocumentNode>) => Promise<DocumentNode>;
  onDeleteNode: (id: number) => Promise<void>;
  onStartReposition: (node: DocumentNode) => void;
}

// ─── inner component ──────────────────────────────────────────────────────────

function NodeGraphManagerInner({
  nodes,
  saving,
  onCreateNode,
  onUpdateNode,
  onDeleteNode,
  onStartReposition,
}: Props) {
  const { zoomIn, zoomOut, setViewport, setCenter, screenToFlowPosition, getViewport } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const centerDone = useRef(false);

  // Graph state
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Interaction context state
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Creation flow
  const [creationStep, setCreationStep] = useState<CreationStep | null>(null);
  const [pendingParentId, setPendingParentId] = useState<number | null>(null);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);

  // Panel state
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [editingNode, setEditingNode] = useState<DocumentNode | null>(null);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ghost cursor refs (DOM manipulation for performance)
  const wrapperRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const ghostEdgeRef = useRef<SVGLineElement>(null);

  // ── sync nodes/edges ──────────────────────────────────────────────────────

  useEffect(() => {
    const abs = computeAbsPositions(nodes);
    const base: Node[] = nodes.map((n): Node => ({
      id: String(n.id),
      position: abs.get(n.id) ?? { x: 0, y: 0 },
      data: { docNode: n },
      type: "managerNode",
      draggable: false,
    }));

    if (pendingPos && creationStep === "placed") {
      base.push({
        id: "__pending__",
        position: pendingPos,
        data: {},
        type: "pendingNode",
        draggable: false,
        selectable: false,
      });
    }

    setRfNodes(base);

    const baseEdges: Edge[] = nodes
      .filter((n) => n.parent_id !== null)
      .map((n): Edge => ({
        id: `e-${n.parent_id}-${n.id}`,
        source: String(n.parent_id!),
        target: String(n.id),
        type: "straight",
        style: { stroke: "#e2e8f0", strokeWidth: 1 },
      }));

    if (pendingPos && creationStep === "placed" && pendingParentId) {
      baseEdges.push({
        id: "__pending-edge__",
        source: String(pendingParentId),
        target: "__pending__",
        type: "straight",
        style: { stroke: "#3b82f6", strokeWidth: 1.5 },
      });
    }

    setRfEdges(baseEdges);
  }, [nodes, pendingPos, creationStep, pendingParentId, setRfNodes, setRfEdges]);

  // ── center on root nodes on initial load ─────────────────────────────────

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

  // ── sync editingNode after reload ───────────────────────────────────────

  useEffect(() => {
    if (editingNode) {
      const upd = nodes.find((n) => n.id === editingNode.id);
      setEditingNode(upd ?? null);
      if (!upd) setPanelMode(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  // ── ghost cursor (DOM manipulation, no re-render) ─────────────────────────

  const updateGhost = useCallback((clientX: number, clientY: number) => {
    if (ghostRef.current) {
      ghostRef.current.style.left = `${clientX}px`;
      ghostRef.current.style.top = `${clientY}px`;
      ghostRef.current.style.display = "block";
    }

    if (ghostEdgeRef.current && pendingParentId) {
      const abs = computeAbsPositions(nodes).get(pendingParentId);
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (abs && rect) {
        const vp = getViewport();
        const x1 = rect.left + abs.x * vp.zoom + vp.x;
        const y1 = rect.top + abs.y * vp.zoom + vp.y;
        ghostEdgeRef.current.setAttribute("x1", String(x1));
        ghostEdgeRef.current.setAttribute("y1", String(y1));
        ghostEdgeRef.current.setAttribute("x2", String(clientX));
        ghostEdgeRef.current.setAttribute("y2", String(clientY));
        ghostEdgeRef.current.style.display = "block";
      }
    }
  }, [pendingParentId, nodes, getViewport]);

  function hideGhost() {
    if (ghostRef.current) ghostRef.current.style.display = "none";
    if (ghostEdgeRef.current) ghostEdgeRef.current.style.display = "none";
  }

  // ── creation flow ─────────────────────────────────────────────────────────

  function startCreation() {
    setPanelMode(null);
    setEditingNode(null);
    setPendingParentId(null);
    setPendingPos(null);
    hideGhost();
    setCreationStep("select-parent");
  }

  function cancelCreation() {
    setCreationStep(null);
    setPendingParentId(null);
    setPendingPos(null);
    hideGhost();
  }

  function openCreatePanel() {
    setPanelMode("create");
  }

  function openEditPanel(node: DocumentNode) {
    setEditingNode(node);
    setPanelMode("edit");
  }

  function closePanel() {
    setPanelMode(null);
    setEditingNode(null);
    if (panelMode === "create") cancelCreation();
  }

  // ── graph event handlers ──────────────────────────────────────────────────

  function handleNodeClick(_: React.MouseEvent, rfNode: Node) {
    if (rfNode.id === "__pending__") return;
    const docNode = nodes.find((n) => String(n.id) === rfNode.id);
    if (!docNode) return;

    if (creationStep === "select-parent") {
      setPendingParentId(docNode.id);
      setCreationStep("placing");
    } else if (creationStep === "placing") {
      const abs = computeAbsPositions(nodes).get(docNode.id);
      if (abs) {
        setPendingPos({ x: abs.x + 60, y: abs.y + 60 });
        setCreationStep("placed");
        hideGhost();
      }
    } else {
      openEditPanel(docNode);
    }
  }

  function handlePaneClick(e: React.MouseEvent) {
    if (creationStep === "select-parent") {
      setPendingParentId(null);
      setCreationStep("placing");
    } else if (creationStep === "placing") {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setPendingPos(pos);
      setCreationStep("placed");
      hideGhost();
    }
  }

  function handleWrapperMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (creationStep === "placing") {
      updateGhost(e.clientX, e.clientY);
    }
  }

  function handleWrapperMouseLeave() {
    hideGhost();
  }

  // ── search ────────────────────────────────────────────────────────────────

  function centerOnNode(docNode: DocumentNode) {
    const abs = computeAbsPositions(nodes).get(docNode.id);
    if (!abs) return;
    setCenter(abs.x, abs.y, { zoom: 1, duration: 400 });
    openEditPanel(docNode);
  }

  const searchResults = searchQuery.trim()
    ? nodes.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // ── save handlers ─────────────────────────────────────────────────────────

  async function handleSaveNew(data: Partial<DocumentNode>) {
    // pendingPos는 절대 flow 좌표이므로, 부모가 있으면 상대 좌표로 변환해서 저장
    const absPos = pendingPos ? { ...pendingPos } : null;
    let relX = absPos?.x ?? 0;
    let relY = absPos?.y ?? 0;
    if (pendingParentId && absPos) {
      const parentAbs = computeAbsPositions(nodes).get(pendingParentId);
      if (parentAbs) {
        relX = absPos.x - parentAbs.x;
        relY = absPos.y - parentAbs.y;
      }
    }
    try {
      const created = await onCreateNode(data, pendingParentId, relX, relY);
      cancelCreation();
      setPanelMode(null);
      // 새 노드가 있는 위치로 뷰포트 이동
      if (absPos) {
        setCenter(absPos.x, absPos.y, { zoom: 1, duration: 500 });
      }
    } catch { /* handled upstream */ }
  }

  async function handleSaveEdit(data: Partial<DocumentNode>) {
    if (!editingNode) return;
    try {
      const updated = await onUpdateNode(editingNode.id, data);
      setEditingNode(updated);
    } catch { /* handled upstream */ }
  }

  async function handleDelete(id: number) {
    try {
      await onDeleteNode(id);
      closePanel();
    } catch { /* handled upstream */ }
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const pendingParentNode = pendingParentId ? nodes.find((n) => n.id === pendingParentId) ?? null : null;
  const showPanel = panelMode !== null;
  const inCreation = creationStep !== null;

  const stepInstruction =
    creationStep === "select-parent" ? "부모 노드를 클릭하거나, 빈 공간을 클릭해 루트로 배치하세요"
    : creationStep === "placing"     ? "그래프에서 원하는 위치를 클릭하세요"
    : "위치가 설정됐습니다. '내용 추가하기'를 눌러 계속하세요.";

  // ─────────────────────────────────────────────────────────────────────────

  if (showPanel) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 h-12 bg-white border-b border-gray-200 shrink-0">
          <button onClick={closePanel}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowRight size={14} className="rotate-180" />
            그래프로 돌아가기
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-xs text-gray-400">
            {panelMode === "create"
              ? `새 노드 · (${Math.round(pendingPos?.x ?? 0)}, ${Math.round(pendingPos?.y ?? 0)})${pendingParentNode ? ` · 부모: ${pendingParentNode.title}` : " · 루트"}`
              : `편집 중: ${editingNode?.title ?? ""}`}
          </span>
        </div>
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <NodeDetail
            node={panelMode === "edit" ? editingNode : null}
            allNodes={nodes}
            isNew={panelMode === "create"}
            parentId={pendingParentId}
            pendingPosition={panelMode === "create" ? pendingPos : null}
            onSave={panelMode === "create" ? handleSaveNew : handleSaveEdit}
            onDelete={handleDelete}
            onReposition={
              panelMode === "edit" && editingNode
                ? () => onStartReposition(editingNode)
                : undefined
            }
            onClose={closePanel}
            saving={saving}
          />
        </div>
      </div>
    );
  }

  return (
    <GraphContext.Provider value={{
      hoveredId,
      selectedId: null,
      editingId: editingNode?.id ?? null,
      pendingParentId,
      setHoveredId,
    }}>
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 relative bg-[#F5F7FA]">

          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 h-12 bg-white border-b border-gray-200 shrink-0">
            {!inCreation ? (
              <>
                <button onClick={startCreation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors">
                  <Plus size={12} />
                  새 노드
                </button>
                <span className="text-xs text-gray-400">노드를 클릭해 선택하거나 새 노드를 추가하세요</span>
              </>
            ) : (
              <>
                <StepPill num={1} label="부모 선택" done={creationStep !== "select-parent"} />
                <div className="w-5 h-px bg-gray-300" />
                <StepPill num={2} label="위치 설정"
                  active={creationStep === "placing"}
                  done={creationStep === "placed" || panelMode === "create"} />
                <div className="w-5 h-px bg-gray-300" />
                <StepPill num={3} label="내용 입력" active={panelMode === "create"} />
                <span className="ml-2 text-xs text-gray-400 italic hidden sm:block">{stepInstruction}</span>
                <div className="flex-1" />
                <button onClick={cancelCreation}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                  <X size={12} />
                  취소
                </button>
              </>
            )}

            <div className={clsx("flex items-center gap-1", !inCreation && "ml-auto")}>
              <CtrlBtn onClick={() => zoomIn()} title="확대"><ZoomIn size={13} /></CtrlBtn>
              <CtrlBtn onClick={() => zoomOut()} title="축소"><ZoomOut size={13} /></CtrlBtn>
              <CtrlBtn onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })} title="초기화">
                <Maximize2 size={13} />
              </CtrlBtn>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <CtrlBtn onClick={() => { setShowSearch(v => !v); setSearchQuery(""); }} title="노드 검색">
                <Search size={13} />
              </CtrlBtn>
            </div>
          </div>

          {/* Search panel */}
          {showSearch && (
            <div className="absolute top-12 right-4 z-30 w-72">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input ref={searchInputRef} type="text" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
                  placeholder="노드 제목으로 검색..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={11} />
                  </button>
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-80 overflow-y-auto">
                  {searchResults.map((node) => {
                    const abs = computeAbsPositions(nodes).get(node.id);
                    return (
                      <button key={node.id}
                        onClick={() => { centerOnNode(node); setSearchQuery(""); setShowSearch(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                        <span className={clsx("shrink-0 w-2 h-2 rounded-full",
                          node.node_kind === "category" ? "bg-violet-500"
                          : node.node_kind === "file" ? "bg-emerald-500" : "bg-blue-500")} />
                        <span className="flex-1 text-xs text-gray-800 truncate font-medium">{node.title}</span>
                        {abs && (
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">
                            ({Math.round(abs.x)}, {Math.round(abs.y)})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {searchQuery.trim() && searchResults.length === 0 && (
                <div className="mt-1.5 bg-white border border-gray-200 rounded-xl shadow-md px-3 py-3">
                  <p className="text-xs text-gray-400">검색 결과가 없습니다</p>
                </div>
              )}
            </div>
          )}

          {/* ReactFlow canvas */}
          <div
            ref={wrapperRef}
            className="flex-1 relative overflow-hidden"
            onMouseMove={handleWrapperMouseMove}
            onMouseLeave={handleWrapperMouseLeave}
          >
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              nodeOrigin={[0.5, 0.5]}
              nodesDraggable={false}
              nodesConnectable={false}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              fitView={false}
              proOptions={{ hideAttribution: true }}
              style={{
                background: "#F5F7FA",
                cursor: creationStep === "placing" ? "crosshair" : undefined,
              }}
              className="w-full h-full"
            >
              <Background variant={BackgroundVariant.Dots} gap={40} size={1.5} color="#d1d5db" />
            </ReactFlow>

            {/* Ghost cursor preview (placing mode) — DOM-manipulated */}
            <div
              ref={ghostRef}
              className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
              style={{ display: "none" }}
            >
              <svg width={14} height={14} style={{ overflow: "visible" }}>
                <circle cx={7} cy={7} r={7}
                  fill="#3b82f620" stroke="#3b82f6"
                  strokeWidth={1.5} strokeDasharray="3,2" />
              </svg>
            </div>

            {/* Ghost edge preview SVG overlay */}
            <svg className="fixed inset-0 w-screen h-screen pointer-events-none z-40">
              <line
                ref={ghostEdgeRef}
                stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="6,3"
                style={{ display: "none" }}
              />
            </svg>
          </div>

          {/* Bottom action panel — 노드 추가 중 "placed" 단계에서만 표시 */}
          {creationStep === "placed" && pendingPos && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center gap-3 bg-white border border-blue-300 rounded-xl px-4 py-3 shadow-lg">
                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Check size={13} className="text-blue-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900">위치 설정 완료</p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    ({Math.round(pendingPos.x)}, {Math.round(pendingPos.y)})
                    {pendingParentNode ? ` · 부모: ${pendingParentNode.title}` : " · 루트 노드"}
                  </p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <button onClick={openCreatePanel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors shrink-0">
                  내용 추가하기 <ArrowRight size={12} />
                </button>
                <button
                  onClick={() => { setPendingPos(null); setCreationStep("placing"); }}
                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                  다시 선택
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </GraphContext.Provider>
  );
}

// ─── exported component ───────────────────────────────────────────────────────

export default function NodeGraphManager(props: Props) {
  return (
    <ReactFlowProvider>
      <NodeGraphManagerInner {...props} />
    </ReactFlowProvider>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StepPill({ num, label, done, active }: {
  num: number; label: string; done?: boolean; active?: boolean;
}) {
  return (
    <div className={clsx("flex items-center gap-1.5 text-xs font-medium",
      done ? "text-green-600" : active ? "text-blue-600" : "text-gray-400")}>
      <span className={clsx("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
        done ? "bg-green-100" : active ? "bg-blue-100" : "bg-gray-100")}>
        {done ? <Check size={9} /> : num}
      </span>
      <span className="hidden sm:block">{label}</span>
    </div>
  );
}


function CtrlBtn({ onClick, title, children }: {
  onClick: () => void; title?: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-700 border border-gray-200 shadow-sm transition-colors">
      {children}
    </button>
  );
}
