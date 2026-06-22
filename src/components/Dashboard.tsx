"use client";

import { FolderOpen, FileText, File, Lock, GitBranch } from "lucide-react";
import type { DocumentNode } from "@/lib/types";

interface DashboardProps {
  nodes: DocumentNode[];
}

export default function Dashboard({ nodes }: DashboardProps) {
  const categories = nodes.filter((n) => n.node_kind === "category").length;
  const contents = nodes.filter((n) => n.node_kind === "content").length;
  const files = nodes.filter((n) => n.node_kind === "file").length;
  const locked = nodes.filter((n) => n.is_locked).length;
  const roots = nodes.filter((n) => n.parent_id === null).length;

  const stats = [
    {
      label: "전체 노드",
      value: nodes.length,
      icon: <GitBranch size={18} />,
      color: "text-blue-600 bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "카테고리",
      value: categories,
      icon: <FolderOpen size={18} />,
      color: "text-violet-600 bg-violet-50",
      border: "border-violet-100",
    },
    {
      label: "문서 노드",
      value: contents,
      icon: <FileText size={18} />,
      color: "text-blue-600 bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "파일 노드",
      value: files,
      icon: <File size={18} />,
      color: "text-emerald-600 bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "잠금됨",
      value: locked,
      icon: <Lock size={18} />,
      color: "text-amber-600 bg-amber-50",
      border: "border-amber-100",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#F5F7FA]">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">대시보드</h2>
          <p className="text-sm text-gray-500 mt-0.5">노드 데이터 현황 요약</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`bg-white rounded-xl border ${s.border} p-4 space-y-3`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent nodes */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">최근 노드 목록</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {nodes.slice(0, 10).map((n) => (
              <div key={n.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs text-gray-400 w-8 shrink-0">#{n.id}</span>
                <KindBadge kind={n.node_kind} />
                <span className="text-sm text-gray-800 flex-1 truncate">{n.title}</span>
                {n.is_locked && <Lock size={12} className="text-gray-300 shrink-0" />}
              </div>
            ))}
            {nodes.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                노드가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    category: { label: "카테고리", cls: "bg-violet-100 text-violet-700" },
    content: { label: "문서", cls: "bg-blue-100 text-blue-700" },
    file: { label: "파일", cls: "bg-emerald-100 text-emerald-700" },
  };
  const info = map[kind] ?? { label: kind, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${info.cls}`}>
      {info.label}
    </span>
  );
}
