"use client";

import { useState } from "react";
import {
  Search,
  FolderOpen,
  FileText,
  File,
  Lock,
  ChevronRight,
  ChevronDown,
  Plus,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import type { DocumentNode, NodeTreeItem } from "@/lib/types";
import { buildTree, flattenTree } from "@/lib/utils";

interface NodeListProps {
  nodes: DocumentNode[];
  selectedId: number | null;
  onSelect: (node: DocumentNode) => void;
  onAdd: (parentId?: number) => void;
  onRefresh: () => void;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function NodeList({
  nodes,
  selectedId,
  onSelect,
  onAdd,
  onRefresh,
  loading,
  searchQuery,
  onSearchChange,
}: NodeListProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const tree = buildTree(nodes);
  const flat = flattenTree(tree);

  const visible = searchQuery.trim()
    ? nodes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.body_content ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  function toggleCollapse(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const rows = visible
    ? visible.map((n) => ({ ...n, children: [], depth: 0 }))
    : flat;

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">전체 문서 노드</h2>
          <p className="text-xs text-gray-400 mt-0.5">{nodes.length}개 노드</p>
        </div>
        <div className="flex items-center gap-1.5">
          <IconBtn onClick={onRefresh} title="새로고침">
            <RefreshCw size={13} className={clsx(loading && "animate-spin")} />
          </IconBtn>
          <button
            onClick={() => onAdd()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
          >
            <Plus size={12} />
            추가
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-gray-100">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="노드 제목 또는 내용 검색..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-gray-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            불러오는 중...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
            <FileText size={24} className="text-gray-300" />
            {searchQuery ? "검색 결과 없음" : "노드가 없습니다"}
          </div>
        ) : (
          <ul className="py-1">
            {rows.map((node) => {
              const hasChildren = "children" in node && (node as NodeTreeItem).children.length > 0;
              const isCollapsed = collapsed.has(node.id);

              if (
                !visible &&
                node.parent_id !== null
              ) {
                const parent = flat.find((n) => n.id === node.parent_id);
                if (parent && collapsed.has(parent.id)) return null;
              }

              return (
                <li key={node.id}>
                  <div
                    className={clsx(
                      "flex items-center gap-1.5 pr-1 transition-colors group",
                      "hover:bg-gray-50",
                      selectedId === node.id && "bg-blue-50 border-r-2 border-blue-500"
                    )}
                  >
                    <button
                      onClick={() => onSelect(node)}
                      className="flex-1 flex items-center gap-1.5 py-2 text-left min-w-0"
                      style={{ paddingLeft: `${12 + (node.depth ?? 0) * 16}px` }}
                    >
                      {/* Collapse toggle */}
                      {hasChildren ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(node.id);
                          }}
                          className="shrink-0 text-gray-400 hover:text-gray-600"
                        >
                          {isCollapsed ? (
                            <ChevronRight size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </button>
                      ) : (
                        <span className="w-3 shrink-0" />
                      )}

                      {/* Icon */}
                      <NodeIcon kind={node.node_kind} />

                      {/* Title */}
                      <span
                        className={clsx(
                          "flex-1 text-xs truncate",
                          selectedId === node.id
                            ? "text-blue-700 font-medium"
                            : "text-gray-700"
                        )}
                      >
                        {node.title}
                      </span>

                      {/* Badges */}
                      {node.is_locked && (
                        <Lock size={10} className="text-gray-400 shrink-0" />
                      )}
                    </button>

                    {/* Add child button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdd(node.id);
                      }}
                      title={`"${node.title}" 하위에 추가`}
                      className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function NodeIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "category":
      return <FolderOpen size={13} className="text-violet-500 shrink-0" />;
    case "file":
      return <File size={13} className="text-emerald-500 shrink-0" />;
    default:
      return <FileText size={13} className="text-blue-500 shrink-0" />;
  }
}

function IconBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
    >
      {children}
    </button>
  );
}
