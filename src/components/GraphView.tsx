"use client";

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, Info, Search, X } from "lucide-react";
import clsx from "clsx";
import type { DocumentNode } from "@/lib/types";

interface Props {
  nodes: DocumentNode[];
  onSelectNode: (node: DocumentNode) => void;
}

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
    const pos = {
      x: parentAbs.x + (node.pos_x ?? 0),
      y: parentAbs.y + (node.pos_y ?? 0),
    };
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

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;

export default function GraphView({ nodes, onSelectNode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const absPositions = computeAbsPositions(nodes);

  function resetView() {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }

  function centerOnNode(node: DocumentNode) {
    const abs = absPositions.get(node.id);
    if (!abs) return;
    setPan({ x: -abs.x * zoom, y: -abs.y * zoom });
    setSelectedId(node.id);
  }

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  const searchResults = searchQuery.trim()
    ? nodes.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

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
      setPan((p) => ({
        x: mx - scale * (mx - p.x),
        y: my - scale * (my - p.y),
      }));
      return next;
    });
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    setDragging(true);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragStart.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx),
      y: dragStart.current.py + (e.clientY - dragStart.current.my),
    });
  }

  function handleMouseUp() {
    dragStart.current = null;
    setDragging(false);
  }

  const cx = size.w / 2 + pan.x;
  const cy = size.h / 2 + pan.y;

  function toSx(absX: number) { return cx + absX * zoom; }
  function toSy(absY: number) { return cy + absY * zoom; }

  const allZero = nodes.every((n) => !n.pos_x && !n.pos_y);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F5F7FA] relative overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        <CtrlBtn onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * 1.25))} title="확대">
          <ZoomIn size={14} />
        </CtrlBtn>
        <CtrlBtn onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z * 0.8))} title="축소">
          <ZoomOut size={14} />
        </CtrlBtn>
        <CtrlBtn onClick={resetView} title="초기화">
          <Maximize2 size={14} />
        </CtrlBtn>
        <CtrlBtn onClick={() => { setShowSearch((v) => !v); setSearchQuery(""); }} title="검색">
          <Search size={14} />
        </CtrlBtn>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 left-4 z-10 text-[10px] text-gray-400 font-mono">
        {Math.round(zoom * 100)}%
      </div>

      {/* Search panel */}
      {showSearch && (
        <div className="absolute top-4 right-16 z-20 w-64">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
              placeholder="노드 제목 검색..."
              className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
              {searchResults.map((node) => (
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
                    "shrink-0 w-1.5 h-1.5 rounded-full",
                    node.node_kind === "category" ? "bg-violet-500"
                    : node.node_kind === "file" ? "bg-emerald-500"
                    : "bg-blue-500"
                  )} />
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

      {/* Canvas */}
      <div
        ref={containerRef}
        className={clsx("flex-1", dragging ? "cursor-grabbing" : "cursor-grab")}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
          {/* Edges */}
          {nodes.map((node) => {
            if (!node.parent_id) return null;
            const abs = absPositions.get(node.id);
            const pabs = absPositions.get(node.parent_id);
            if (!abs || !pabs) return null;
            const isHighlighted = node.id === hoveredId || node.parent_id === hoveredId
              || node.id === selectedId || node.parent_id === selectedId;
            return (
              <line
                key={`e-${node.id}`}
                x1={toSx(pabs.x)} y1={toSy(pabs.y)}
                x2={toSx(abs.x)}  y2={toSy(abs.y)}
                stroke={isHighlighted ? "#94a3b8" : "#cbd5e1"}
                strokeWidth={isHighlighted ? 1.5 : 1}
              />
            );
          })}
        </svg>

        {/* Nodes — rendered as HTML for pointer events */}
        {nodes.map((node) => {
          const abs = absPositions.get(node.id);
          if (!abs) return null;
          const sx = toSx(abs.x);
          const sy = toSy(abs.y);
          const r = (node.parent_id === null ? 10 : 7) * Math.max(0.5, zoom);
          const { fill, stroke } = nodeColor(node.node_kind);
          const isHovered = hoveredId === node.id;
          const isSelected = selectedId === node.id;

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: sx, top: sy, zIndex: isSelected ? 20 : isHovered ? 10 : 1 }}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(node.id);
              }}
            >
              <svg
                width={r * 2 + 8}
                height={r * 2 + 8}
                style={{ overflow: "visible", cursor: "pointer", display: "block" }}
              >
                <circle
                  cx={r + 4}
                  cy={r + 4}
                  r={r}
                  fill={isSelected ? "#ef4444" : fill}
                  stroke={isSelected ? "#dc2626" : isHovered ? "#1e293b" : stroke}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                  style={{ transition: "r 0.1s" }}
                />
              </svg>

              {/* Label */}
              {zoom > 0.4 && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
                  style={{ top: r * 2 + 8, fontSize: Math.max(8, 11 * zoom) }}
                >
                  <span
                    className={clsx(
                      "font-mono",
                      isSelected ? "text-red-500" : isHovered ? "text-gray-900" : "text-gray-500"
                    )}
                  >
                    {node.title}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected node info panel */}
      {selectedId && (() => {
        const node = nodes.find((n) => n.id === selectedId);
        if (!node) return null;
        return (
          <div className="absolute bottom-4 left-4 z-20 bg-white border border-gray-200 rounded-xl p-4 w-64 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-mono">#{node.id}</span>
              <span className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                node.node_kind === "category" ? "bg-violet-100 text-violet-700" :
                node.node_kind === "file" ? "bg-emerald-100 text-emerald-700" :
                "bg-blue-100 text-blue-700"
              )}>
                {node.node_kind === "category" ? "카테고리" : node.node_kind === "file" ? "파일" : "문서"}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate">{node.title}</p>
            {node.pos_x !== null && (
              <p className="text-[10px] text-gray-400 font-mono">
                pos ({Math.round(node.pos_x ?? 0)}, {Math.round(node.pos_y ?? 0)})
              </p>
            )}
            <button
              onClick={() => onSelectNode(node)}
              className="w-full mt-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 transition-colors border border-gray-200"
            >
              노드 관리에서 열기 →
            </button>
          </div>
        );
      })()}
    </div>
  );
}

function CtrlBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-700 border border-gray-200 shadow-sm transition-colors"
    >
      {children}
    </button>
  );
}
