"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useNodesInitialized,
  useViewport,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ZoomIn, ZoomOut, Maximize2, Plus, X, ArrowRight, Search, Trash2, MapPin, Target,
} from "lucide-react";
import clsx from "clsx";
import type { DocumentNode, NodeEdge, TreeLevel } from "@/lib/types";
import { findRootNode } from "@/lib/utils";
import NodeDetail from "./NodeDetail";
import { DotNode } from "./DotNode";
import { DetailVisibleContext } from "./treeViewContext";

// 줌이 이 값 아래로 내려가면 별자리 모드(유저 화면과 동일) — 라벨/목차 숨기고 레벨 타원 표시
const ADMIN_ZOOM_OUT_THRESHOLD = 0.4;
const LEVEL_LABEL_SIZE = 25;
const EDGE_ACTIVE = { stroke: "#ffffff", strokeWidth: 2 };
const EDGE_DELETING = { stroke: "#ef4444", strokeWidth: 2 };

function isRootDocNode(n: DocumentNode) {
  return n.title === "Root" || (n.node_kind as string) === "root";
}

// DocumentNode → DotNode가 기대하는 유저 화면 data 포맷. 관리자는 항상 '전체 펼침'으로 본다
// (잠금/열람 상태와 무관하게 항상 크고 라벨이 보이는 상태) — 편집 중엔 모든 정보가 보이는 게 우선이라서.
function buildDotData(docNode: DocumentNode): Record<string, unknown> {
  if (isRootDocNode(docNode)) {
    return { isRoot: true, isLoggedIn: true, label: docNode.title };
  }
  const indexItems = (docNode.index_items ?? []).map((item) =>
    typeof item === "string" ? item : (item as { title?: string }).title ?? ""
  );
  return {
    label: docNode.title,
    isViewed: true,
    indexItems,
    indexCount: indexItems.length,
    readCount: indexItems.length,
  };
}

// ─── types ────────────────────────────────────────────────────────────────────

type GraphMode = "default" | "add-node" | "add-edge" | "reposition" | "edit-levels";

// ─── context ─────────────────────────────────────────────────────────────────

interface GraphCtx {
  hoveredId: number | null;
  editingId: number | null;
  edgeSourceId: number | null;
  graphMode: GraphMode;
  levels: TreeLevel[];
  setHoveredId: (id: number | null) => void;
}

const GraphContext = createContext<GraphCtx>({
  hoveredId: null,
  editingId: null,
  edgeSourceId: null,
  graphMode: "default",
  levels: [],
  setHoveredId: () => {},
});

// ─── custom node ─────────────────────────────────────────────────────────────
// 유저 화면과 똑같은 DotNode를 그대로 쓰고, 편집 상태(선택/엣지 소스/엣지 타겟 후보)만
// 가는 링으로 얹는다 — DotNode 자체는 건드리지 않아 유저가 보는 모습과 항상 동일하다.

type DocNodeData = { docNode: DocumentNode };

function AdminTreeNode(props: NodeProps) {
  const { docNode } = props.data as DocNodeData;
  const { hoveredId, editingId, edgeSourceId, graphMode, setHoveredId } = useContext(GraphContext);
  const id = docNode.id;
  const isRoot = isRootDocNode(docNode);

  const isEditing = editingId === id;
  const isEdgeSrc = edgeSourceId === id;
  const isHoverTarget = graphMode === "add-edge" && hoveredId === id && !isEdgeSrc;

  const ring = isEditing ? { color: "#ef4444", dashed: false }
    : isEdgeSrc      ? { color: "#f97316", dashed: true }
    : isHoverTarget  ? { color: "#22c55e", dashed: false }
    : null;
  const ringSize = isRoot ? 52 : 42;

  return (
    <div
      className="relative"
      style={{ cursor: "pointer" }}
      onMouseEnter={() => setHoveredId(id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      {ring && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            width: ringSize, height: ringSize,
            border: `2px ${ring.dashed ? "dashed" : "solid"} ${ring.color}`,
          }}
        />
      )}
      <DotNode {...props} data={buildDotData(docNode)} />
    </div>
  );
}

const nodeTypes = { dot: AdminTreeNode };

// ─── props ────────────────────────────────────────────────────────────────────

interface Props {
  nodes: DocumentNode[];
  edges: NodeEdge[];
  levels: TreeLevel[];
  saving: boolean;
  onCreateNode: (data: Partial<DocumentNode>, posX: number, posY: number) => Promise<DocumentNode>;
  onUpdateNode: (id: number, data: Partial<DocumentNode>) => Promise<DocumentNode>;
  onDeleteNode: (id: number) => Promise<void>;
  onCreateEdge: (sourceId: number, targetId: number) => Promise<NodeEdge>;
  onDeleteEdge: (id: number) => Promise<void>;
  onCreateLevel: (
    data: Pick<TreeLevel, "name" | "center_x" | "center_y" | "radius_x" | "radius_y" | "color">
  ) => Promise<TreeLevel>;
  onUpdateLevel: (
    id: number,
    data: Partial<Pick<TreeLevel, "name" | "center_x" | "center_y" | "radius_x" | "radius_y" | "color">>
  ) => Promise<TreeLevel>;
  onDeleteLevel: (id: number) => Promise<void>;
}

// ─── inner component ──────────────────────────────────────────────────────────

function NodeGraphManagerInner({
  nodes, edges, levels, saving,
  onCreateNode, onUpdateNode, onDeleteNode, onCreateEdge, onDeleteEdge,
  onCreateLevel, onUpdateLevel, onDeleteLevel,
}: Props) {
  const { zoomIn, zoomOut, setViewport, setCenter, screenToFlowPosition, getViewport } = useReactFlow();
  const viewport = useViewport();
  const nodesInitialized = useNodesInitialized();
  const centerDone = useRef(false);
  // 줌아웃 시 유저 화면과 동일하게 라벨/목차를 숨기고 별자리 모드로 전환
  const zoomedOut = viewport.zoom < ADMIN_ZOOM_OUT_THRESHOLD;

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [graphMode, setGraphMode]       = useState<GraphMode>("default");
  const [editingNode, setEditingNode]   = useState<DocumentNode | null>(null);
  const [pendingPos, setPendingPos]     = useState<{ x: number; y: number } | null>(null);
  const [edgeSourceId, setEdgeSourceId] = useState<number | null>(null);
  const [deletingEdge, setDeletingEdge] = useState<NodeEdge | null>(null);
  const [hoveredId, setHoveredId]       = useState<number | null>(null);
  const [showSearch, setShowSearch]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [localLevels, setLocalLevels] = useState<TreeLevel[]>(levels);
  const isDraggingLevelRef = useRef(false);

  useEffect(() => {
    if (!isDraggingLevelRef.current) setLocalLevels(levels);
  }, [levels]);

  const canvasRef    = useRef<HTMLDivElement>(null);
  const ghostNodeRef = useRef<HTMLDivElement>(null);
  const ghostEdgeRef = useRef<SVGLineElement>(null);

  const [panelWidth, setPanelWidth] = useState(380);
  const isResizing   = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);

  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    isResizing.current   = true;
    resizeStartX.current = e.clientX;
    resizeStartW.current = panelWidth;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(ev: MouseEvent) {
      if (!isResizing.current) return;
      const dx  = resizeStartX.current - ev.clientX;
      const nw  = Math.max(260, Math.min(680, resizeStartW.current + dx));
      setPanelWidth(nw);
    }
    function onUp() {
      isResizing.current             = false;
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  const showPanel   = editingNode !== null || pendingPos !== null;
  const panelIsNew  = pendingPos !== null && editingNode === null;

  // ── sync rfNodes ────────────────────────────────────────────────────────────

  useEffect(() => {
    setRfNodes(nodes.map((n): Node => ({
      id: String(n.id),
      position: { x: n.pos_x ?? 0, y: n.pos_y ?? 0 },
      data: { docNode: n },
      type: "dot",
      draggable: false,
      zIndex: 10,
    })));
  }, [nodes, setRfNodes]);

  // ── sync rfEdges (유저 화면과 동일한 흰 굵은 선 — 관리자는 항상 전체 펼침이라 모두 활성) ─────

  useEffect(() => {
    setRfEdges(edges.map((e): Edge => ({
      id: String(e.id),
      source: String(e.source_id),
      target: String(e.target_id),
      type: "straight",
      style: deletingEdge?.id === e.id ? EDGE_DELETING : EDGE_ACTIVE,
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, deletingEdge, setRfEdges]);

  // ── initial centering ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!nodesInitialized || centerDone.current || nodes.length === 0) return;
    const cx = nodes.reduce((s, n) => s + (n.pos_x ?? 0), 0) / nodes.length;
    const cy = nodes.reduce((s, n) => s + (n.pos_y ?? 0), 0) / nodes.length;
    setCenter(cx, cy, { zoom: 1 });
    centerDone.current = true;
  }, [nodesInitialized, nodes, setCenter]);

  // ── keep editingNode in sync after reload ────────────────────────────────────

  useEffect(() => {
    if (!editingNode) return;
    const upd = nodes.find((n) => n.id === editingNode.id);
    if (upd) setEditingNode(upd);
    else { setEditingNode(null); setPendingPos(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  // ── ghost helpers ────────────────────────────────────────────────────────────

  const updateGhostNode = useCallback((cx: number, cy: number) => {
    if (ghostNodeRef.current) {
      ghostNodeRef.current.style.left = `${cx}px`;
      ghostNodeRef.current.style.top  = `${cy}px`;
      ghostNodeRef.current.style.display = "block";
    }
  }, []);

  const updateGhostEdge = useCallback((cx: number, cy: number) => {
    if (!ghostEdgeRef.current || !edgeSourceId) return;
    const src = nodes.find((n) => n.id === edgeSourceId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!src || !rect) return;
    const vp = getViewport();
    ghostEdgeRef.current.setAttribute("x1", String(rect.left + (src.pos_x ?? 0) * vp.zoom + vp.x));
    ghostEdgeRef.current.setAttribute("y1", String(rect.top  + (src.pos_y ?? 0) * vp.zoom + vp.y));
    ghostEdgeRef.current.setAttribute("x2", String(cx));
    ghostEdgeRef.current.setAttribute("y2", String(cy));
    ghostEdgeRef.current.style.display = "block";
  }, [edgeSourceId, nodes, getViewport]);

  function hideGhosts() {
    if (ghostNodeRef.current) ghostNodeRef.current.style.display = "none";
    if (ghostEdgeRef.current) ghostEdgeRef.current.style.display = "none";
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (graphMode === "add-node" || graphMode === "reposition") updateGhostNode(e.clientX, e.clientY);
    else if (graphMode === "add-edge" && edgeSourceId) updateGhostEdge(e.clientX, e.clientY);
  }

  // ── mode management ──────────────────────────────────────────────────────────

  function switchMode(mode: GraphMode) {
    setGraphMode(mode);
    setEdgeSourceId(null);
    setDeletingEdge(null);
    hideGhosts();
  }

  // ── graph events ─────────────────────────────────────────────────────────────

  function handleNodeClick(_: React.MouseEvent, rfNode: Node) {
    const docNode = nodes.find((n) => String(n.id) === rfNode.id);
    if (!docNode) return;

    if (graphMode === "add-edge") {
      if (!edgeSourceId) {
        setEdgeSourceId(docNode.id);
      } else if (edgeSourceId === docNode.id) {
        setEdgeSourceId(null); hideGhosts();
      } else {
        doCreateEdge(edgeSourceId, docNode.id);
      }
    } else if (graphMode === "default") {
      setPendingPos(null);
      setEditingNode(docNode);
      setCenter(docNode.pos_x ?? 0, docNode.pos_y ?? 0, { zoom: 1, duration: 400 });
    }
    // add-node / reposition: node clicks ignored
  }

  function handlePaneClick(e: React.MouseEvent) {
    if (graphMode === "add-node") {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setEditingNode(null);
      setPendingPos(pos);
      hideGhosts();
      setGraphMode("default");
    } else if (graphMode === "reposition") {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      if (editingNode) doReposition(editingNode.id, pos.x, pos.y);
    } else if (graphMode === "add-edge") {
      setEdgeSourceId(null); hideGhosts();
    }
  }

  function handleEdgeClick(_: React.MouseEvent, rfEdge: Edge) {
    if (graphMode !== "default") return;
    const edge = edges.find((e) => String(e.id) === rfEdge.id);
    if (edge) setDeletingEdge(edge);
  }

  // ── async ops ────────────────────────────────────────────────────────────────

  async function doCreateEdge(sourceId: number, targetId: number) {
    setEdgeSourceId(null); hideGhosts();
    try { await onCreateEdge(sourceId, targetId); }
    catch (e) { alert(e instanceof Error ? e.message : "엣지 생성 실패"); }
  }

  async function doDeleteEdge() {
    if (!deletingEdge) return;
    const id = deletingEdge.id;
    setDeletingEdge(null);
    try { await onDeleteEdge(id); }
    catch (e) { alert(e instanceof Error ? e.message : "엣지 삭제 실패"); }
  }

  async function doReposition(id: number, x: number, y: number) {
    setGraphMode("default"); hideGhosts();
    try {
      const updated = await onUpdateNode(id, { pos_x: Math.round(x), pos_y: Math.round(y) });
      setEditingNode(updated);
      setCenter(x, y, { zoom: 1, duration: 300 });
    } catch (e) { alert(e instanceof Error ? e.message : "위치 변경 실패"); }
  }

  // ── level boundary editing (독립 타원: 중심 이동 / 가로·세로 반경 조절) ────────────

  type LevelDragMode = "center" | "rx" | "ry";

  function startLevelDrag(e: React.MouseEvent, level: TreeLevel, mode: LevelDragMode) {
    e.stopPropagation();
    isDraggingLevelRef.current = true;
    let current = {
      center_x: level.center_x, center_y: level.center_y,
      radius_x: level.radius_x, radius_y: level.radius_y,
    };

    function onMove(ev: MouseEvent) {
      const flowPos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      if (mode === "center") {
        current = { ...current, center_x: Math.round(flowPos.x), center_y: Math.round(flowPos.y) };
      } else if (mode === "rx") {
        current = { ...current, radius_x: Math.max(10, Math.round(Math.abs(flowPos.x - current.center_x))) };
      } else {
        current = { ...current, radius_y: Math.max(10, Math.round(Math.abs(flowPos.y - current.center_y))) };
      }
      setLocalLevels((prev) => prev.map((l) => (l.id === level.id ? { ...l, ...current } : l)));
    }
    async function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      isDraggingLevelRef.current = false;
      try { await onUpdateLevel(level.id, current); }
      catch (err) { alert(err instanceof Error ? err.message : "레벨 수정 실패"); }
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  type EditableLevelField = "name" | "color" | "center_x" | "center_y" | "radius_x" | "radius_y";

  function updateLocalLevelField<K extends EditableLevelField>(id: number, field: K, value: TreeLevel[K]) {
    setLocalLevels((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  async function commitLevelField(id: number, field: EditableLevelField) {
    const lvl = localLevels.find((l) => l.id === id);
    if (!lvl) return;
    try { await onUpdateLevel(id, { [field]: lvl[field] }); }
    catch (err) { alert(err instanceof Error ? err.message : "레벨 수정 실패"); }
  }

  async function addLevel() {
    const cx = rootNode?.pos_x ?? 0;
    const cy = rootNode?.pos_y ?? 0;
    const size = 200 + localLevels.length * 150;
    try {
      await onCreateLevel({
        name: `Level ${localLevels.length + 1}`,
        center_x: cx, center_y: cy,
        radius_x: size, radius_y: size,
        color: "#3b82f6",
      });
    } catch (err) { alert(err instanceof Error ? err.message : "레벨 추가 실패"); }
  }

  async function removeLevel(id: number) {
    if (!confirm("이 레벨을 삭제하시겠습니까?")) return;
    try { await onDeleteLevel(id); }
    catch (err) { alert(err instanceof Error ? err.message : "레벨 삭제 실패"); }
  }

  // ── panel callbacks ──────────────────────────────────────────────────────────

  function closePanel() {
    if (editingNode) setCenter(editingNode.pos_x ?? 0, editingNode.pos_y ?? 0, { zoom: 1, duration: 400 });
    setEditingNode(null);
    setPendingPos(null);
  }

  function startReposition() {
    if (editingNode) setCenter(editingNode.pos_x ?? 0, editingNode.pos_y ?? 0, { zoom: 1, duration: 300 });
    setGraphMode("reposition");
  }

  async function handleSaveNew(data: Partial<DocumentNode>) {
    if (!pendingPos) return;
    try {
      const created = await onCreateNode(data, Math.round(pendingPos.x), Math.round(pendingPos.y));
      setPendingPos(null);
      setEditingNode(created);
      setCenter(pendingPos.x, pendingPos.y, { zoom: 1, duration: 400 });
    } catch { /* handled upstream */ }
  }

  async function handleSaveEdit(data: Partial<DocumentNode>) {
    if (!editingNode) return;
    try {
      const updated = await onUpdateNode(editingNode.id, data);
      setEditingNode(updated);
    } catch { /* handled upstream */ }
  }

  async function handleDeleteNode(id: number) {
    try { await onDeleteNode(id); setEditingNode(null); setPendingPos(null); }
    catch { /* handled upstream */ }
  }

  // ── search ───────────────────────────────────────────────────────────────────

  function centerOnNode(docNode: DocumentNode) {
    setCenter(docNode.pos_x ?? 0, docNode.pos_y ?? 0, { zoom: 1, duration: 400 });
    setPendingPos(null);
    setEditingNode(docNode);
    setShowSearch(false); setSearchQuery("");
  }

  const searchResults = searchQuery.trim()
    ? nodes.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // ── derived ──────────────────────────────────────────────────────────────────

  const rootNode    = findRootNode(nodes);
  const edgeSrcNode = edgeSourceId ? nodes.find((n) => n.id === edgeSourceId) : null;
  const delSrcNode  = deletingEdge ? nodes.find((n) => n.id === deletingEdge.source_id) : null;
  const delTgtNode  = deletingEdge ? nodes.find((n) => n.id === deletingEdge.target_id) : null;

  const modeHint: Record<GraphMode, string> = {
    "default":     "노드 클릭 → 우측 패널에서 편집 · 엣지 클릭 → 삭제",
    "add-node":    "빈 캔버스를 클릭해 노드를 배치하세요",
    "add-edge":    edgeSourceId ? "타겟 노드를 클릭하세요 · 빈 공간 클릭으로 취소" : "소스 노드를 클릭하세요",
    "reposition":  `새 위치를 클릭하세요 · "${editingNode?.title ?? ""}"`,
    "edit-levels": "● 핸들 드래그로 이동, ■ 핸들 드래그로 가로/세로 크기 조절",
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <GraphContext.Provider value={{ hoveredId, editingId: editingNode?.id ?? null, edgeSourceId, graphMode, levels: localLevels, setHoveredId }}>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── Top toolbar (full width) ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 h-12 bg-white border-b border-gray-200 shrink-0">

          {/* Mode buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <ModeBtn active={graphMode === "default"} onClick={() => switchMode("default")}>
              기본
            </ModeBtn>
            <ModeBtn active={graphMode === "add-node"} accent="blue"
              onClick={() => switchMode(graphMode === "add-node" ? "default" : "add-node")}>
              <Plus size={11} className="mr-1" />노드 추가
            </ModeBtn>
            <ModeBtn active={graphMode === "add-edge"} accent="orange"
              onClick={() => switchMode(graphMode === "add-edge" ? "default" : "add-edge")}>
              <ArrowRight size={11} className="mr-1" />엣지 추가
            </ModeBtn>
            <ModeBtn active={graphMode === "edit-levels"} accent="purple"
              onClick={() => switchMode(graphMode === "edit-levels" ? "default" : "edit-levels")}>
              <Target size={11} className="mr-1" />레벨 편집
            </ModeBtn>
          </div>

          {/* Hint / source pill */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs text-gray-400 italic truncate hidden md:block">
              {modeHint[graphMode]}
            </span>
            {graphMode === "add-edge" && edgeSrcNode && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                {edgeSrcNode.title}
                <button onClick={() => { setEdgeSourceId(null); hideGhosts(); }}>
                  <X size={10} className="ml-0.5 text-orange-400 hover:text-orange-700" />
                </button>
              </span>
            )}
            {graphMode === "reposition" && (
              <button
                onClick={() => { switchMode("default"); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0"
              >
                <X size={11} />취소
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <CtrlBtn onClick={() => zoomIn()} title="확대"><ZoomIn size={13} /></CtrlBtn>
            <CtrlBtn onClick={() => zoomOut()} title="축소"><ZoomOut size={13} /></CtrlBtn>
            <CtrlBtn onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })} title="초기화"><Maximize2 size={13} /></CtrlBtn>
            {rootNode && (
              <>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button
                  onClick={() => setCenter(rootNode.pos_x ?? 0, rootNode.pos_y ?? 0, { zoom: 1, duration: 500 })}
                  title="Root 노드로 이동"
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-50 text-amber-600 border border-amber-200 shadow-sm text-[11px] font-bold transition-colors"
                >
                  ROOT
                </button>
              </>
            )}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <CtrlBtn onClick={() => { setShowSearch((v) => !v); setSearchQuery(""); }} title="검색">
              <Search size={13} />
            </CtrlBtn>
          </div>
        </div>

        {/* ── Main area: canvas + right panel ──────────────────────────────── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">

          {/* Canvas — 유저 화면(TreeCanvas)과 동일한 어두운 배경 + DotNode 렌더링 */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden bg-black"
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={hideGhosts}
          >
            {/* Noise overlay (유저 화면과 동일) */}
            <div className="athena-noise pointer-events-none absolute inset-0 z-0" />

            <div className={clsx("absolute inset-0 z-[1]", zoomedOut && "tree-zoomed-out")}>
              <DetailVisibleContext.Provider value={!zoomedOut}>
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
                  onEdgeClick={handleEdgeClick}
                  fitView={false}
                  minZoom={0.02}
                  maxZoom={3}
                  proOptions={{ hideAttribution: true }}
                  colorMode="dark"
                  style={{
                    background: "transparent",
                    cursor: graphMode === "add-node" || graphMode === "reposition" ? "crosshair"
                           : graphMode === "add-edge" ? "pointer" : undefined,
                  }}
                  className="w-full h-full"
                />
              </DetailVisibleContext.Provider>
            </div>

            {/* 레벨 타원 — 기본 모드: 유저 화면과 동일하게 줌아웃했을 때만 흰 타원 + 라벨로 페이드인 */}
            {graphMode === "default" && localLevels.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-500"
                style={{ overflow: "visible", opacity: zoomedOut ? 1 : 0 }}
              >
                <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
                  {localLevels.map((lvl) => (
                    <g key={lvl.id}>
                      <ellipse
                        cx={lvl.center_x} cy={lvl.center_y} rx={lvl.radius_x} ry={lvl.radius_y}
                        fill="none" stroke="#ffffff" strokeWidth={1 / viewport.zoom}
                      />
                      <text
                        className="font-pixel"
                        x={lvl.center_x - lvl.radius_x - (LEVEL_LABEL_SIZE / ADMIN_ZOOM_OUT_THRESHOLD) * 0.4}
                        y={lvl.center_y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        style={{ fontSize: LEVEL_LABEL_SIZE / ADMIN_ZOOM_OUT_THRESHOLD }}
                      >
                        {lvl.name.toUpperCase()}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            )}

            {/* 레벨 타원 — 편집 모드: 레벨별 색상 + 드래그 핸들 (편집 도구이므로 줌과 무관하게 항상 표시) */}
            {graphMode === "edit-levels" && localLevels.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                style={{ overflow: "visible" }}
              >
                <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
                  {[...localLevels].sort((a, b) => (b.radius_x * b.radius_y) - (a.radius_x * a.radius_y)).map((lvl) => (
                    <ellipse
                      key={lvl.id}
                      cx={lvl.center_x}
                      cy={lvl.center_y}
                      rx={lvl.radius_x}
                      ry={lvl.radius_y}
                      fill="none"
                      stroke={lvl.color ?? "#3b82f6"}
                      strokeWidth={1.5 / viewport.zoom}
                      strokeDasharray={`${6 / viewport.zoom},${4 / viewport.zoom}`}
                    />
                  ))}
                  {localLevels.map((lvl) => (
                    <g key={`handles-${lvl.id}`}>
                      {/* 중심 이동 핸들 */}
                      <g transform={`translate(${lvl.center_x} ${lvl.center_y}) scale(${1 / viewport.zoom})`}>
                        <circle
                          r={5}
                          fill={lvl.color ?? "#3b82f6"}
                          stroke="#fff" strokeWidth={1.5}
                          style={{ cursor: "move", pointerEvents: "auto" }}
                          onMouseDown={(e) => startLevelDrag(e, lvl, "center")}
                        />
                      </g>
                      {/* 가로 반경 핸들 */}
                      <g transform={`translate(${lvl.center_x + lvl.radius_x} ${lvl.center_y}) scale(${1 / viewport.zoom})`}>
                        <rect
                          x={-6} y={-6} width={12} height={12} rx={2}
                          fill={lvl.color ?? "#3b82f6"}
                          stroke="#fff" strokeWidth={1.5}
                          style={{ cursor: "ew-resize", pointerEvents: "auto" }}
                          onMouseDown={(e) => startLevelDrag(e, lvl, "rx")}
                        />
                      </g>
                      {/* 세로 반경 핸들 */}
                      <g transform={`translate(${lvl.center_x} ${lvl.center_y + lvl.radius_y}) scale(${1 / viewport.zoom})`}>
                        <rect
                          x={-6} y={-6} width={12} height={12} rx={2}
                          fill={lvl.color ?? "#3b82f6"}
                          stroke="#fff" strokeWidth={1.5}
                          style={{ cursor: "ns-resize", pointerEvents: "auto" }}
                          onMouseDown={(e) => startLevelDrag(e, lvl, "ry")}
                        />
                      </g>
                    </g>
                  ))}
                </g>
              </svg>
            )}

            {/* Ghost node cursor */}
            <div ref={ghostNodeRef} className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2" style={{ display: "none" }}>
              <svg width={14} height={14} style={{ overflow: "visible" }}>
                <circle cx={7} cy={7} r={7}
                  fill={graphMode === "reposition" ? "#f9731620" : "#3b82f620"}
                  stroke={graphMode === "reposition" ? "#f97316" : "#3b82f6"}
                  strokeWidth={1.5} strokeDasharray="3,2" />
              </svg>
            </div>

            {/* Ghost edge */}
            <svg className="fixed inset-0 w-screen h-screen pointer-events-none z-40">
              <line ref={ghostEdgeRef} stroke="#f97316" strokeWidth={1.5} strokeDasharray="6,3" style={{ display: "none" }} />
            </svg>

            {/* Reposition banner */}
            {graphMode === "reposition" && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white border border-blue-200 rounded-xl px-4 py-2.5 shadow-lg">
                <MapPin size={13} className="text-blue-500" />
                <p className="text-xs font-medium text-gray-800">새 위치를 클릭하세요</p>
                <button onClick={() => switchMode("default")} className="ml-1 text-xs text-gray-400 hover:text-gray-700">
                  <X size={11} />
                </button>
              </div>
            )}

            {/* Edge delete confirm */}
            {deletingEdge && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-3 bg-white border border-red-200 rounded-xl px-4 py-3 shadow-lg">
                  <Trash2 size={14} className="text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900">엣지 삭제</p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {delSrcNode?.title ?? "?"} → {delTgtNode?.title ?? "?"}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <button onClick={doDeleteEdge}
                    className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors shrink-0">
                    삭제
                  </button>
                  <button onClick={() => setDeletingEdge(null)}
                    className="text-xs text-gray-400 hover:text-gray-700 shrink-0">
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* Search dropdown */}
            {showSearch && (
              <div className="absolute top-3 right-3 z-30 w-72">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input ref={searchInputRef} type="text" value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
                    placeholder="노드 제목으로 검색..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={11} />
                    </button>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                    {searchResults.map((node) => (
                      <button key={node.id} onClick={() => centerOnNode(node)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                        <span className={clsx("shrink-0 w-2 h-2 rounded-full",
                          node.node_kind === "category" ? "bg-violet-500"
                          : node.node_kind === "file" ? "bg-emerald-500" : "bg-blue-500")} />
                        <span className="flex-1 text-xs text-gray-800 truncate font-medium">{node.title}</span>
                        <span className="text-[10px] text-gray-400 font-mono shrink-0">
                          ({Math.round(node.pos_x ?? 0)}, {Math.round(node.pos_y ?? 0)})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.trim() && searchResults.length === 0 && (
                  <div className="mt-1.5 bg-white border border-gray-200 rounded-xl shadow-md px-3 py-3">
                    <p className="text-xs text-gray-400">검색 결과가 없습니다</p>
                  </div>
                )}
              </div>
            )}

            {/* Level list panel */}
            {graphMode === "edit-levels" && (
              <div className="absolute top-3 left-3 z-30 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-700">레벨(바운더리) 설정</span>
                  <button
                    onClick={addLevel}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-50 text-violet-600 hover:bg-violet-100 text-[11px] font-medium transition-colors"
                  >
                    <Plus size={11} />레벨 추가
                  </button>
                </div>
                {localLevels.map((lvl) => (
                  <div key={lvl.id} className="px-3.5 py-2.5 border-b border-gray-50 last:border-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={lvl.color ?? "#3b82f6"}
                        onChange={(e) => { updateLocalLevelField(lvl.id, "color", e.target.value); }}
                        onBlur={() => commitLevelField(lvl.id, "color")}
                        className="w-6 h-6 rounded border border-gray-200 shrink-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={lvl.name}
                        onChange={(e) => updateLocalLevelField(lvl.id, "name", e.target.value)}
                        onBlur={() => commitLevelField(lvl.id, "name")}
                        className="flex-1 min-w-0 text-xs text-gray-800 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      />
                      <button
                        onClick={() => removeLevel(lvl.id)}
                        className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <LevelNumberField label="X" value={lvl.center_x}
                        onChange={(v) => updateLocalLevelField(lvl.id, "center_x", v)}
                        onCommit={() => commitLevelField(lvl.id, "center_x")} />
                      <LevelNumberField label="Y" value={lvl.center_y}
                        onChange={(v) => updateLocalLevelField(lvl.id, "center_y", v)}
                        onCommit={() => commitLevelField(lvl.id, "center_y")} />
                      <LevelNumberField label="가로" value={lvl.radius_x}
                        onChange={(v) => updateLocalLevelField(lvl.id, "radius_x", Math.max(10, v))}
                        onCommit={() => commitLevelField(lvl.id, "radius_x")} />
                      <LevelNumberField label="세로" value={lvl.radius_y}
                        onChange={(v) => updateLocalLevelField(lvl.id, "radius_y", Math.max(10, v))}
                        onCommit={() => commitLevelField(lvl.id, "radius_y")} />
                    </div>
                  </div>
                ))}
                {localLevels.length === 0 && (
                  <p className="px-3.5 py-3 text-[11px] text-gray-400">아직 레벨이 없습니다. &quot;레벨 추가&quot;로 시작하세요.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Resize handle + Right panel ──────────────────────────────── */}
          {showPanel && (
            <>
              {/* Drag handle — dragging left widens panel, right narrows */}
              <div
                onMouseDown={handleResizeStart}
                className="w-1.5 shrink-0 bg-gray-200 hover:bg-blue-400 active:bg-blue-500 cursor-col-resize transition-colors z-10 group"
                title="드래그해서 패널 크기 조정"
              >
                <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-px h-8 bg-blue-300 rounded-full" />
                </div>
              </div>

              {/* Detail panel */}
              <div
                style={{ width: panelWidth }}
                className="shrink-0 flex flex-col min-h-0 overflow-hidden bg-[#F5F7FA]"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 h-10 bg-white border-b border-gray-200 shrink-0">
                  <span className="text-xs text-gray-500 truncate">
                    {panelIsNew
                      ? `새 노드 · (${Math.round(pendingPos!.x)}, ${Math.round(pendingPos!.y)})`
                      : `편집 중: ${editingNode?.title ?? ""}`}
                  </span>
                  <button onClick={closePanel}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0">
                    <X size={13} />
                  </button>
                </div>

                <NodeDetail
                  node={panelIsNew ? null : editingNode}
                  isNew={panelIsNew}
                  pendingPosition={panelIsNew ? pendingPos : null}
                  onSave={panelIsNew ? handleSaveNew : handleSaveEdit}
                  onDelete={handleDeleteNode}
                  onReposition={!panelIsNew && editingNode ? startReposition : undefined}
                  onClose={closePanel}
                  saving={saving}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </GraphContext.Provider>
  );
}

// ─── exported wrapper ─────────────────────────────────────────────────────────

export default function NodeGraphManager(props: Props) {
  return (
    <ReactFlowProvider>
      <NodeGraphManagerInner {...props} />
    </ReactFlowProvider>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ModeBtn({ children, active, onClick, accent = "gray" }: {
  children: React.ReactNode; active: boolean; onClick: () => void; accent?: "gray" | "blue" | "orange" | "purple";
}) {
  const cls = {
    gray:   { on: "bg-gray-800 text-white",   off: "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50" },
    blue:   { on: "bg-blue-500 text-white",   off: "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50" },
    orange: { on: "bg-orange-500 text-white", off: "bg-white text-orange-600 border border-orange-200 hover:bg-orange-50" },
    purple: { on: "bg-violet-500 text-white", off: "bg-white text-violet-600 border border-violet-200 hover:bg-violet-50" },
  }[accent];
  return (
    <button onClick={onClick}
      className={clsx("flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", active ? cls.on : cls.off)}>
      {children}
    </button>
  );
}

function LevelNumberField({ label, value, onChange, onCommit }: {
  label: string; value: number; onChange: (v: number) => void; onCommit: () => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onCommit}
        className="w-full text-[11px] font-mono text-gray-700 border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
      />
    </label>
  );
}

function CtrlBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-700 border border-gray-200 shadow-sm transition-colors">
      {children}
    </button>
  );
}
