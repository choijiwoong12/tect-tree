"use client";

import { useState, useRef, useCallback, useLayoutEffect, useEffect } from "react";
import {
  ZoomIn, ZoomOut, Maximize2, Plus, X, ArrowRight, Check,
  FileText, FolderOpen, File, Search,
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

function nodeColor(kind: string) {
  switch (kind) {
    case "category": return { fill: "#7c3aed", stroke: "#c4b5fd" };
    case "file":     return { fill: "#059669", stroke: "#6ee7b7" };
    default:         return { fill: "#2563eb", stroke: "#93c5fd" };
  }
}

const ZOOM_MIN = 0.2, ZOOM_MAX = 4;
type CreationStep = "select-parent" | "placing" | "placed";

// ─── props ────────────────────────────────────────────────────────────────────

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

// ─── component ───────────────────────────────────────────────────────────────

export default function NodeGraphManager({
  nodes,
  saving,
  onCreateNode,
  onUpdateNode,
  onDeleteNode,
  onStartReposition,
}: Props) {
  // Graph state
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const didDrag = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [hoverNodeId, setHoverNodeId] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selection state
  const [selectedNode, setSelectedNode] = useState<DocumentNode | null>(null);

  // Creation flow
  const [creationStep, setCreationStep] = useState<CreationStep | null>(null);
  const [pendingParentId, setPendingParentId] = useState<number | null>(null);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);

  // Right panel
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [editingNode, setEditingNode] = useState<DocumentNode | null>(null);

  // Sync editingNode / selectedNode after nodes refresh
  useEffect(() => {
    if (editingNode) {
      const upd = nodes.find((n) => n.id === editingNode.id);
      setEditingNode(upd ?? null);
      if (!upd) setPanelMode(null);
    }
    if (selectedNode) {
      const upd = nodes.find((n) => n.id === selectedNode.id);
      setSelectedNode(upd ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const absPositions = computeAbsPositions(nodes);
  const cx = size.w / 2 + pan.x;
  const cy = size.h / 2 + pan.y;
  const toSx = (ax: number) => cx + ax * zoom;
  const toSy = (ay: number) => cy + ay * zoom;
  const fromSx = (sx: number) => (sx - cx) / zoom;
  const fromSy = (sy: number) => (sy - cy) / zoom;

  // ── graph interaction ──────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.85 : 1 / 0.85;
    setZoom((z) => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * delta));
      const scale = next / z;
      setPan((p) => ({ x: mx - scale * (mx - p.x), y: my - scale * (my - p.y) }));
      return next;
    });
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    didDrag.current = false;
    dragRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    setDragging(true);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (dragRef.current) {
      const dx = Math.abs(e.clientX - dragRef.current.mx);
      const dy = Math.abs(e.clientY - dragRef.current.my);
      if (dx > 3 || dy > 3) didDrag.current = true;
      setPan({
        x: dragRef.current.px + (e.clientX - dragRef.current.mx),
        y: dragRef.current.py + (e.clientY - dragRef.current.my),
      });
    }
    if (creationStep === "placing") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }

  function handleMouseUp() {
    dragRef.current = null;
    setDragging(false);
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (didDrag.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (creationStep === "select-parent") {
      // Empty canvas click → root node (no parent)
      setPendingParentId(null);
      setCreationStep("placing");
    } else if (creationStep === "placing") {
      setPendingPos({ x: fromSx(mx), y: fromSy(my) });
      setCreationStep("placed");
      setHoverPos(null);
    } else {
      // Deselect in browse mode
      setSelectedNode(null);
    }
  }

  function handleNodeClick(e: React.MouseEvent, node: DocumentNode) {
    e.stopPropagation();
    if (didDrag.current) return;

    if (creationStep === "select-parent") {
      setPendingParentId(node.id);
      setCreationStep("placing");
    } else if (creationStep === "placing") {
      // Place at this node's position (with small offset)
      const abs = absPositions.get(node.id);
      if (abs) {
        setPendingPos({ x: abs.x + 60, y: abs.y + 60 });
        setCreationStep("placed");
        setHoverPos(null);
      }
    } else {
      setSelectedNode(node);
      setPanelMode(null);
      setEditingNode(null);
    }
  }

  // ── search ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  function centerOnNode(node: DocumentNode) {
    const abs = absPositions.get(node.id);
    if (!abs) return;
    setPan({ x: -abs.x * zoom, y: -abs.y * zoom });
    setSelectedNode(node);
    setPanelMode(null);
    setEditingNode(null);
  }

  const searchResults = searchQuery.trim()
    ? nodes.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // ── creation actions ───────────────────────────────────────────────────────

  function startCreation() {
    setSelectedNode(null);
    setPanelMode(null);
    setEditingNode(null);
    setPendingParentId(null);
    setPendingPos(null);
    setHoverPos(null);
    setCreationStep("select-parent");
  }

  function cancelCreation() {
    setCreationStep(null);
    setPendingParentId(null);
    setPendingPos(null);
    setHoverPos(null);
  }

  function openCreatePanel() {
    setPanelMode("create");
  }

  function openEditPanel(node: DocumentNode) {
    setSelectedNode(null);
    setEditingNode(node);
    setPanelMode("edit");
  }

  function closePanel() {
    setPanelMode(null);
    setEditingNode(null);
    if (panelMode === "create") cancelCreation();
  }

  // ── save / delete handlers ─────────────────────────────────────────────────

  async function handleSaveNew(data: Partial<DocumentNode>) {
    try {
      const created = await onCreateNode(
        data,
        pendingParentId,
        pendingPos?.x ?? 0,
        pendingPos?.y ?? 0
      );
      cancelCreation();
      setPanelMode(null);
      setSelectedNode(created);
    } catch {
      // error handled upstream (alert)
    }
  }

  async function handleSaveEdit(data: Partial<DocumentNode>) {
    if (!editingNode) return;
    try {
      const updated = await onUpdateNode(editingNode.id, data);
      setEditingNode(updated);
    } catch {
      // error handled upstream
    }
  }

  async function handleDelete(id: number) {
    try {
      await onDeleteNode(id);
      closePanel();
    } catch {
      // error handled upstream
    }
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const pendingParentNode = pendingParentId
    ? nodes.find((n) => n.id === pendingParentId) ?? null
    : null;

  const showPanel = panelMode !== null;
  const inCreation = creationStep !== null;
  const parentAbs = pendingParentId ? absPositions.get(pendingParentId) : null;

  const stepInstruction =
    creationStep === "select-parent"
      ? "부모 노드를 클릭하거나, 빈 공간을 클릭해 루트로 배치하세요"
      : creationStep === "placing"
      ? "그래프에서 원하는 위치를 클릭하세요"
      : "위치가 설정됐습니다. '내용 추가하기'를 눌러 계속하세요.";

  // ─────────────────────────────────────────────────────────────────────────

  if (showPanel) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Full-page header */}
        <div className="flex items-center gap-3 px-5 h-12 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={closePanel}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
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
        {/* NodeDetail fills remaining space */}
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
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* ── Graph area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-[#F5F7FA]">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 h-12 bg-white border-b border-gray-200 shrink-0">
          {!inCreation ? (
            <>
              <button
                onClick={startCreation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
              >
                <Plus size={12} />
                새 노드
              </button>
              <span className="text-xs text-gray-400">
                노드를 클릭해 선택하거나 새 노드를 추가하세요
              </span>
            </>
          ) : (
            <>
              <StepPill
                num={1}
                label="부모 선택"
                done={creationStep !== "select-parent"}
              />
              <div className="w-5 h-px bg-gray-300" />
              <StepPill
                num={2}
                label="위치 설정"
                active={creationStep === "placing"}
                done={creationStep === "placed" || panelMode === "create"}
              />
              <div className="w-5 h-px bg-gray-300" />
              <StepPill
                num={3}
                label="내용 입력"
                active={panelMode === "create"}
              />
              <span className="ml-2 text-xs text-gray-400 italic hidden sm:block">
                {stepInstruction}
              </span>
              <div className="flex-1" />
              <button
                onClick={cancelCreation}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={12} />
                취소
              </button>
            </>
          )}

          {/* Zoom + Search controls */}
          <div className={clsx("flex items-center gap-1", !inCreation && "ml-auto")}>
            <CtrlBtn onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * 1.25))} title="확대">
              <ZoomIn size={13} />
            </CtrlBtn>
            <CtrlBtn onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z * 0.8))} title="축소">
              <ZoomOut size={13} />
            </CtrlBtn>
            <CtrlBtn onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} title="초기화">
              <Maximize2 size={13} />
            </CtrlBtn>
            <span className="text-[10px] text-gray-400 font-mono ml-1 mr-1">
              {Math.round(zoom * 100)}%
            </span>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <CtrlBtn
              onClick={() => { setShowSearch((v) => !v); setSearchQuery(""); }}
              title="노드 검색"
            >
              <Search size={13} />
            </CtrlBtn>
          </div>
        </div>

        {/* Search panel */}
        {showSearch && (
          <div className="absolute top-12 right-4 z-30 w-72">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
                placeholder="노드 제목으로 검색..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-80 overflow-y-auto">
                {searchResults.map((node) => {
                  const abs = absPositions.get(node.id);
                  return (
                    <button
                      key={node.id}
                      onClick={() => {
                        centerOnNode(node);
                        setSearchQuery("");
                        setShowSearch(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <span className={clsx(
                        "shrink-0 w-2 h-2 rounded-full",
                        node.node_kind === "category" ? "bg-violet-500"
                        : node.node_kind === "file" ? "bg-emerald-500"
                        : "bg-blue-500"
                      )} />
                      <span className="flex-1 text-xs text-gray-800 truncate font-medium">
                        {node.title}
                      </span>
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

        {/* Canvas */}
        <div
          ref={containerRef}
          className={clsx(
            "flex-1 relative overflow-hidden select-none",
            creationStep === "placing"
              ? "cursor-crosshair"
              : dragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); setHoverPos(null); }}
          onClick={handleCanvasClick}
          onWheel={handleWheel}
        >
          {/* Grid dots */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #d1d5db 1.5px, transparent 1.5px)",
              backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
              backgroundPosition: `${pan.x % (40 * zoom)}px ${pan.y % (40 * zoom)}px`,
            }}
          />

          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
            {/* Existing edges */}
            {nodes.map((node) => {
              if (!node.parent_id) return null;
              const abs = absPositions.get(node.id);
              const pabs = absPositions.get(node.parent_id);
              if (!abs || !pabs) return null;
              const hl =
                node.id === hoverNodeId || node.parent_id === hoverNodeId ||
                node.id === selectedNode?.id || node.parent_id === selectedNode?.id ||
                node.id === editingNode?.id || node.parent_id === editingNode?.id ||
                node.id === pendingParentId || node.parent_id === pendingParentId;
              return (
                <line
                  key={`e-${node.id}`}
                  x1={toSx(pabs.x)} y1={toSy(pabs.y)}
                  x2={toSx(abs.x)}  y2={toSy(abs.y)}
                  stroke={hl ? "#94a3b8" : "#e2e8f0"}
                  strokeWidth={hl ? 1.5 : 1}
                />
              );
            })}

            {/* Preview edge (placing mode) */}
            {creationStep === "placing" && hoverPos && (
              <line
                x1={parentAbs ? toSx(parentAbs.x) : cx}
                y1={parentAbs ? toSy(parentAbs.y) : cy}
                x2={hoverPos.x} y2={hoverPos.y}
                stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="6,3"
              />
            )}

            {/* Confirmed edge (placed) */}
            {creationStep === "placed" && pendingPos && (
              <line
                x1={parentAbs ? toSx(parentAbs.x) : cx}
                y1={parentAbs ? toSy(parentAbs.y) : cy}
                x2={toSx(pendingPos.x)} y2={toSy(pendingPos.y)}
                stroke="#3b82f6" strokeWidth={1.5}
              />
            )}

            {/* Hover preview dot */}
            {creationStep === "placing" && hoverPos && !dragRef.current && (
              <circle
                cx={hoverPos.x} cy={hoverPos.y} r={6}
                fill="#3b82f620" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3,2"
              />
            )}

            {/* Placed dot */}
            {creationStep === "placed" && pendingPos && (
              <circle
                cx={toSx(pendingPos.x)} cy={toSy(pendingPos.y)} r={7}
                fill="#3b82f6" stroke="#fff" strokeWidth={2.5}
              />
            )}
          </svg>

          {/* Node circles */}
          {nodes.map((node) => {
            const abs = absPositions.get(node.id);
            if (!abs) return null;
            const sx = toSx(abs.x);
            const sy = toSy(abs.y);
            const r = (node.parent_id === null ? 10 : 7) * Math.max(0.5, zoom);
            const { fill, stroke } = nodeColor(node.node_kind);
            const isSelected = selectedNode?.id === node.id || editingNode?.id === node.id;
            const isPendingParent = pendingParentId === node.id;
            const isHovered = hoverNodeId === node.id;

            return (
              <div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: sx, top: sy, zIndex: isSelected ? 20 : isHovered ? 10 : 1 }}
                onMouseEnter={() => setHoverNodeId(node.id)}
                onMouseLeave={() => setHoverNodeId(null)}
                onClick={(e) => handleNodeClick(e, node)}
              >
                <svg
                  width={r * 2 + 8} height={r * 2 + 8}
                  style={{ overflow: "visible", cursor: "pointer", display: "block" }}
                >
                  <circle
                    cx={r + 4} cy={r + 4} r={r}
                    fill={isSelected ? "#ef4444" : isPendingParent ? "#f97316" : fill}
                    stroke={
                      isSelected ? "#dc2626"
                      : isPendingParent ? "#ea580c"
                      : isHovered ? "#1e293b"
                      : stroke
                    }
                    strokeWidth={isSelected || isPendingParent ? 2.5 : isHovered ? 2 : 1}
                  />
                </svg>
                {zoom > 0.4 && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
                    style={{ top: r * 2 + 8, fontSize: Math.max(8, 11 * zoom) }}
                  >
                    <span className={clsx(
                      "font-mono",
                      isSelected ? "text-red-500"
                      : isPendingParent ? "text-orange-500"
                      : isHovered ? "text-gray-900"
                      : "text-gray-500"
                    )}>
                      {node.title}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom action panel */}
        {(selectedNode || creationStep === "placed") && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
            {/* Browse: selected existing node */}
            {selectedNode && !inCreation && (
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
                <NodeKindIcon kind={selectedNode.node_kind} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                    {selectedNode.title}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    #{selectedNode.id} · ({Math.round(selectedNode.pos_x ?? 0)}, {Math.round(selectedNode.pos_y ?? 0)})
                  </p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <button
                  onClick={() => openEditPanel(selectedNode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors shrink-0"
                >
                  편집하기
                  <ArrowRight size={12} />
                </button>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* After position placed */}
            {creationStep === "placed" && pendingPos && (
              <div className="flex items-center gap-3 bg-white border border-blue-300 rounded-xl px-4 py-3 shadow-lg">
                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Check size={13} className="text-blue-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900">위치 설정 완료</p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    ({Math.round(pendingPos.x)}, {Math.round(pendingPos.y)})
                    {pendingParentNode && ` · 부모: ${pendingParentNode.title}`}
                    {!pendingParentNode && " · 루트 노드"}
                  </p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <button
                  onClick={openCreatePanel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors shrink-0"
                >
                  내용 추가하기
                  <ArrowRight size={12} />
                </button>
                <button
                  onClick={() => { setPendingPos(null); setCreationStep("placing"); }}
                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                >
                  다시 선택
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StepPill({
  num, label, done, active,
}: {
  num: number;
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div className={clsx(
      "flex items-center gap-1.5 text-xs font-medium",
      done ? "text-green-600" : active ? "text-blue-600" : "text-gray-400"
    )}>
      <span className={clsx(
        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
        done ? "bg-green-100" : active ? "bg-blue-100" : "bg-gray-100"
      )}>
        {done ? <Check size={9} /> : num}
      </span>
      <span className="hidden sm:block">{label}</span>
    </div>
  );
}

function NodeKindIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "category": return <FolderOpen size={15} className="text-violet-500 shrink-0" />;
    case "file":     return <File size={15} className="text-emerald-500 shrink-0" />;
    default:         return <FileText size={15} className="text-blue-500 shrink-0" />;
  }
}

function CtrlBtn({
  onClick, title, children,
}: {
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-700 border border-gray-200 shadow-sm transition-colors"
    >
      {children}
    </button>
  );
}
