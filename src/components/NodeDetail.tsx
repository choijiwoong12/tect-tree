"use client";

import { useState, useEffect } from "react";
import {
  X,
  Save,
  Trash2,
  Lock,
  Unlock,
  Tag,
  Hash,
  GitBranch,
  FileText,
} from "lucide-react";
import clsx from "clsx";
import type { DocumentNode, NodeKind } from "@/lib/types";
import { nodeKindLabel, nodeKindColor } from "@/lib/utils";
import RichEditor from "./RichEditor";

interface NodeDetailProps {
  node: DocumentNode | null;
  allNodes: DocumentNode[];
  isNew: boolean;
  parentId?: number | null;
  onSave: (data: Partial<DocumentNode>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

export default function NodeDetail({
  node,
  allNodes,
  isNew,
  parentId,
  onSave,
  onDelete,
  onClose,
  saving,
}: NodeDetailProps) {
  const [title, setTitle] = useState("");
  const [nodeKind, setNodeKind] = useState<NodeKind>("content");
  const [bodyContent, setBodyContent] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isNew) {
      setTitle("");
      setNodeKind("content");
      setBodyContent("");
      setSelectedParentId(parentId ?? null);
      setIsLocked(false);
    } else if (node) {
      setTitle(node.title);
      setNodeKind(node.node_kind);
      setBodyContent(node.body_content ?? "");
      setSelectedParentId(node.parent_id);
      setIsLocked(node.is_locked);
    }
    setConfirmDelete(false);
  }, [node, isNew, parentId]);

  if (!node && !isNew) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F5F7FA] text-gray-400 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
          <GitBranch size={24} className="text-gray-300" />
        </div>
        <p className="text-sm">노드를 선택하거나 새로 추가하세요</p>
      </div>
    );
  }

  const parentNode = allNodes.find((n) => n.id === selectedParentId);

  async function handleSave() {
    await onSave({
      title,
      node_kind: nodeKind,
      body_content: bodyContent || null,
      parent_id: selectedParentId,
      is_locked: isLocked,
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F5F7FA]">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              nodeKindColor(nodeKind)
            )}
          >
            {nodeKindLabel(nodeKind)}
          </span>
          <h3 className="text-sm font-semibold text-gray-900">
            {isNew ? "새 노드 추가" : (node?.title ?? "")}
          </h3>
          {!isNew && node && (
            <span className="text-xs text-gray-400">#{node.id}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && node && (
            <>
              <button
                onClick={() => setIsLocked((v) => !v)}
                title={isLocked ? "잠금 해제" : "잠금"}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 font-medium">정말 삭제?</span>
                  <button
                    onClick={() => onDelete(node.id)}
                    className="px-2 py-1 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
          <button
            onClick={() => {
              setConfirmDelete(false);
              onClose();
            }}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Metadata card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <SectionLabel icon={<Tag size={12} />}>기본 정보</SectionLabel>

          <div className="grid grid-cols-2 gap-3">
            <Field label="제목" className="col-span-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="노드 제목"
                className="input"
              />
            </Field>

            <Field label="유형">
              <select
                value={nodeKind}
                onChange={(e) => setNodeKind(e.target.value as NodeKind)}
                className="input"
              >
                <option value="category">카테고리</option>
                <option value="content">문서</option>
                <option value="file">파일</option>
              </select>
            </Field>

            <Field label="부모 노드">
              <select
                value={selectedParentId ?? ""}
                onChange={(e) =>
                  setSelectedParentId(
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className="input"
              >
                <option value="">없음 (루트)</option>
                {allNodes
                  .filter((n) => n.id !== node?.id)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
              </select>
            </Field>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap gap-3 pt-1">
            {parentNode && (
              <InfoPill icon={<Hash size={10} />}>
                부모: {parentNode.title}
              </InfoPill>
            )}
            {isLocked && (
              <InfoPill icon={<Lock size={10} />} className="text-amber-700 bg-amber-50 border-amber-200">
                잠금됨
              </InfoPill>
            )}
            {!isNew && node?.created_at && (
              <InfoPill icon={<FileText size={10} />}>
                생성: {new Date(node.created_at).toLocaleDateString("ko-KR")}
              </InfoPill>
            )}
          </div>
        </div>

        {/* Content editor */}
        {nodeKind !== "file" && (
          <div className="space-y-2">
            <SectionLabel icon={<FileText size={12} />}>내용 에디터</SectionLabel>
            <RichEditor
              content={bodyContent}
              onChange={setBodyContent}
              placeholder="노드 내용을 입력하세요..."
            />
          </div>
        )}

        {nodeKind === "file" && node?.file_name && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <SectionLabel icon={<FileText size={12} />}>첨부 파일</SectionLabel>
            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <FileText size={16} className="text-emerald-500 shrink-0" />
              <span className="text-sm text-gray-700 truncate">{node.file_name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-t border-gray-200 shrink-0">
        <p className="text-xs text-gray-400">
          {isNew ? "새 노드를 생성합니다" : `노드 #${node?.id} 수정`}
        </p>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className={clsx(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            saving || !title.trim()
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          )}
        >
          <Save size={13} />
          {saving ? "저장 중..." : isNew ? "다음: 위치 설정 →" : "저장"}
        </button>
      </div>
    </div>
  );
}

function SectionLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {icon}
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function InfoPill({
  icon,
  children,
  className,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] text-gray-500 bg-gray-50 border-gray-200",
        className
      )}
    >
      {icon}
      {children}
    </div>
  );
}
