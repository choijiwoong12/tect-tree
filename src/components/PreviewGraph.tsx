"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import clsx from "clsx";
import type { DocumentNode, NodeEdge } from "@/lib/types";
import PreviewTreeCanvas, { type PreviewMode } from "./PreviewTreeCanvas";

// ─── props ────────────────────────────────────────────────────────────────────

interface Props {
  nodes: DocumentNode[];
  edges: NodeEdge[];
}

// ─── component ────────────────────────────────────────────────────────────────

export default function PreviewGraph({ nodes, edges }: Props) {
  const [mode, setMode] = useState<PreviewMode>("full");

  function isRoot(n: DocumentNode) {
    return n.title === "Root" || (n.node_kind as string) === "root";
  }

  const totalCnt  = nodes.filter((n) => !isRoot(n)).length;
  const lockedCnt = nodes.filter((n) => !isRoot(n) && n.is_locked).length;
  const freeCnt   = totalCnt - lockedCnt;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-black">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-11 bg-[#0d0d0d] border-b border-[#1e1e1e] shrink-0">
        <Eye size={13} className="text-[#555]" />
        <span className="text-white text-sm font-medium">그래프 미리보기</span>

        <div className="w-px h-4 bg-[#2a2a2a]" />

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-0.5">
          <ModeBtn active={mode === "full"}  onClick={() => setMode("full")}>
            전체 해금
          </ModeBtn>
          <ModeBtn active={mode === "guest"} onClick={() => setMode("guest")}>
            비로그인
          </ModeBtn>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 ml-1">
          <Stat label="전체" value={totalCnt}  color="#888" />
          <Stat label="무료" value={freeCnt}   color="#ffffff" />
          <Stat label="유료" value={lockedCnt} color="#f97316" />
        </div>

        <div className="flex-1" />

        <span className="text-[#444] text-xs">유저 화면 시뮬레이션</span>
      </div>

      {/* ── Canvas (exact user-front rendering) ──────────────────────────── */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {/* Noise overlay (same as user-front) */}
        <div className="athena-noise pointer-events-none absolute inset-0 z-0" />

        {/* Tree canvas */}
        <div className="absolute inset-0 z-10">
          <PreviewTreeCanvas nodes={nodes} edges={edges} mode={mode} />
        </div>

        {/* Mode badge */}
        <div className={clsx(
          "absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full text-xs font-medium border pointer-events-none",
          mode === "full"
            ? "bg-white/10 border-white/20 text-white"
            : "bg-[#404040]/20 border-[#404040] text-[#888]"
        )}>
          {mode === "full" ? "전체 해금 시뮬레이션" : "비로그인 시뮬레이션"}
        </div>
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function ModeBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-3 py-1 rounded-md text-xs font-medium transition-colors",
        active ? "bg-white text-black" : "text-[#888] hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[#555] text-[10px]">{label}</span>
      <span className="text-[11px] font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}
