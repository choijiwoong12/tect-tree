"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import type { DocumentNode } from "@/lib/types";

interface Props {
  nodes: DocumentNode[];
  parentId: number | null;
  newNodeTitle: string;
  onConfirm: (x: number, y: number) => void;
  onBack: () => void;
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

export default function NodePositionPicker({
  nodes,
  parentId,
  newNodeTitle,
  onConfirm,
  onBack,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [placed, setPlaced] = useState<{ x: number; y: number } | null>(null);

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
  const parentNode = parentId ? nodes.find((n) => n.id === parentId) : null;
  const parentAbs = parentId
    ? (absPositions.get(parentId) ?? { x: 0, y: 0 })
    : { x: 0, y: 0 };

  const cx = size.w / 2;
  const cy = size.h / 2;

  function toSx(absX: number) {
    return absX - parentAbs.x + cx;
  }
  function toSy(absY: number) {
    return absY - parentAbs.y + cy;
  }

  function handleMouseMove(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleClick(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPlaced({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleConfirm() {
    if (!placed) return;
    onConfirm(placed.x - cx, placed.y - cy);
  }

  const previewPos = placed ?? mouse;

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F7FA] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={14} />
            뒤로
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <div>
            <p className="text-sm font-semibold text-gray-900">노드 위치 설정</p>
            <p className="text-xs text-gray-400">
              {parentNode
                ? `"${parentNode.title}" 기준 오프셋`
                : "루트 절대 위치"}{" "}
              — 클릭하여 배치
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {placed && (
            <span className="text-xs text-gray-400 font-mono">
              오프셋 ({Math.round(placed.x - cx)}, {Math.round(placed.y - cy)})
            </span>
          )}
          <button
            onClick={handleConfirm}
            disabled={!placed}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              placed
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <MapPin size={14} />
            이 위치에 배치
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-crosshair select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMouse(null)}
        onClick={handleClick}
      >
        {/* Grid dots */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, #d1d5db 1.5px, transparent 1.5px)",
            backgroundSize: "40px 40px",
          }}
        />

        {size.w > 0 && (
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: "none" }}
          >
            {/* Existing edges */}
            {nodes.map((node) => {
              if (!node.parent_id) return null;
              const abs = absPositions.get(node.id);
              const pabs = absPositions.get(node.parent_id);
              if (!abs || !pabs) return null;
              return (
                <line
                  key={`edge-${node.id}`}
                  x1={toSx(pabs.x)}
                  y1={toSy(pabs.y)}
                  x2={toSx(abs.x)}
                  y2={toSy(abs.y)}
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                />
              );
            })}

            {/* Preview edge from parent to cursor/placed */}
            {previewPos && (
              <line
                x1={cx}
                y1={cy}
                x2={previewPos.x}
                y2={previewPos.y}
                stroke={placed ? "#3b82f6" : "#94a3b8"}
                strokeWidth={1.5}
                strokeDasharray={placed ? "none" : "5,4"}
              />
            )}

            {/* Existing nodes */}
            {nodes.map((node) => {
              const abs = absPositions.get(node.id);
              if (!abs) return null;
              const sx = toSx(abs.x);
              const sy = toSy(abs.y);
              const isParent = node.id === parentId;
              const fill = node.node_kind === "category" ? "#7c3aed"
                : node.node_kind === "file" ? "#059669"
                : "#2563eb";

              return (
                <g key={`node-${node.id}`}>
                  <circle
                    cx={sx}
                    cy={sy}
                    r={isParent ? 9 : 5}
                    fill={isParent ? "#ef4444" : fill}
                    stroke={isParent ? "#dc2626" : "none"}
                    strokeWidth={isParent ? 2 : 0}
                  />
                  <text
                    x={sx}
                    y={sy + (isParent ? 22 : 17)}
                    textAnchor="middle"
                    fill={isParent ? "#ef4444" : "#6b7280"}
                    fontSize={isParent ? 11 : 10}
                    fontFamily="monospace"
                  >
                    {node.title}
                  </text>
                </g>
              );
            })}

            {/* Preview node (hover) */}
            {mouse && !placed && (
              <circle
                cx={mouse.x}
                cy={mouse.y}
                r={6}
                fill="#3b82f620"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="3,2"
              />
            )}

            {/* Placed node */}
            {placed && (
              <g>
                <circle
                  cx={placed.x}
                  cy={placed.y}
                  r={7}
                  fill="#3b82f6"
                  stroke="#fff"
                  strokeWidth={2.5}
                />
                <text
                  x={placed.x}
                  y={placed.y + 20}
                  textAnchor="middle"
                  fill="#2563eb"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  {newNodeTitle}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-white border-t border-gray-200 shrink-0">
        <p className="text-xs text-gray-400 text-center">
          {placed
            ? "위치가 선택됐습니다. 위치를 바꾸려면 다시 클릭하세요."
            : "빈 공간을 클릭해 새 노드의 위치를 선택하세요."}
        </p>
      </div>
    </div>
  );
}
