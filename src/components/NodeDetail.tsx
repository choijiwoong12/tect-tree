"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  MapPin,
  List,
  Maximize2,
  Minimize2,
} from "lucide-react";
import clsx from "clsx";
import type { DocumentNode, IndexItem, NodeKind } from "@/lib/types";
import { nodeKindLabel, nodeKindColor } from "@/lib/utils";
import RichEditor from "./RichEditor";
import WysiwygEditor from "./WysiwygEditor";

function extractH1s(html: string): IndexItem[] {
  if (!html || typeof window === "undefined") return [];
  const div = document.createElement("div");
  div.innerHTML = html;
  return Array.from(div.querySelectorAll("h1"))
    .map((el, i) => ({
      id: `h1-${i}`,
      title: el.textContent?.trim() ?? "",
    }))
    .filter((item) => item.title);
}

interface NodeDetailProps {
  node: DocumentNode | null;
  isNew: boolean;
  pendingPosition?: { x: number; y: number } | null;
  onSave: (data: Partial<DocumentNode>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReposition?: () => void;
  onClose: () => void;
  saving: boolean;
  // 전체화면 편집 오버레이를 가둘 영역(캔버스+패널 행) — 사이드바/상단 헤더는 덮지 않는다
  fullscreenPortalTarget?: HTMLElement | null;
}

export default function NodeDetail({
  node,
  isNew,
  pendingPosition,
  onSave,
  onDelete,
  onReposition,
  onClose,
  saving,
  fullscreenPortalTarget,
}: NodeDetailProps) {
  const [title, setTitle] = useState("");
  const [nodeKind, setNodeKind] = useState<NodeKind>("content");
  const [bodyContent, setBodyContent] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [price, setPrice] = useState<string>("");
  const [indexItems, setIndexItems] = useState<IndexItem[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (isNew) {
      setTitle("");
      setNodeKind("content");
      setBodyContent("");
      setIsLocked(true);
      setPrice("");
      setIndexItems([]);
    } else if (node) {
      setTitle(node.title);
      setNodeKind(node.node_kind);
      setBodyContent(node.body_content ?? "");
      setIsLocked(node.is_locked);
      setPrice(node.price !== null && node.price !== undefined ? String(node.price) : "");
      setIndexItems(extractH1s(node.body_content ?? ""));
    }
    setConfirmDelete(false);
  }, [node, isNew]);

  useEffect(() => {
    setIndexItems(extractH1s(bodyContent));
  }, [bodyContent]);

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

  async function handleSave() {
    await onSave({
      title,
      node_kind: nodeKind,
      body_content: bodyContent || null,
      is_locked: isLocked,
      price: price.trim() === "" ? null : parseInt(price.replace(/,/g, ""), 10),
      index_items: indexItems.length > 0 ? indexItems : null,
    });
  }

  // 좁은 패널 전용 본문 카드들(기본 정보 ~ 첨부 파일) — 전체화면은 유저 화면과 동일한
  // 제목+목차+본문 WYSIWYG 뷰(WysiwygEditor)를 따로 그린다.
  const sections = (
    <>
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
              <option value="content">문서</option>
              <option value="category">카테고리</option>
              <option value="file">파일</option>
            </select>
          </Field>

          <Field label="가격 (RP)">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                RP
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={price}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setPrice(raw ? Number(raw).toLocaleString() : "");
                }}
                placeholder="무료"
                className="input pl-8"
              />
            </div>
          </Field>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap gap-3 pt-1">
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

      {/* Position info */}
      {(isNew ? !!pendingPosition : !!node) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <SectionLabel icon={<MapPin size={12} />}>위치 설정</SectionLabel>
          <div className="flex items-center gap-3">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">X 좌표</span>
                <span className="text-sm font-mono text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
                  {isNew ? Math.round(pendingPosition!.x) : Math.round(node!.pos_x ?? 0)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Y 좌표</span>
                <span className="text-sm font-mono text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
                  {isNew ? Math.round(pendingPosition!.y) : Math.round(node!.pos_y ?? 0)}
                </span>
              </div>
            </div>
            {!isNew && onReposition && (
              <button
                onClick={onReposition}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
              >
                <MapPin size={13} />
                위치 변경
              </button>
            )}
          </div>
        </div>
      )}

      {/* Index items */}
      {nodeKind !== "file" && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel icon={<List size={12} />}>목차 항목</SectionLabel>
            <span className="text-[11px] text-gray-400">H1 제목으로 자동 생성</span>
          </div>

          {indexItems.length > 0 ? (
            <ul className="space-y-1.5">
              {indexItems.map((item, idx) => (
                <li key={item.id} className="flex items-center gap-2.5 py-1.5 px-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="shrink-0 text-[11px] font-mono text-gray-300 w-4 text-right">{idx + 1}</span>
                  <span className="flex-1 text-sm text-gray-700 truncate">{item.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic py-1">
              내용 에디터에서 H1 제목을 추가하면 자동으로 목차가 생성됩니다.
            </p>
          )}
        </div>
      )}

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
    </>
  );

  const headerActionsProps = {
    isNew, node, nodeKind, isLocked, setIsLocked,
    confirmDelete, setConfirmDelete, onDelete,
    isFullscreen, setIsFullscreen, onClose,
  };

  const saveButton = (
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
      {saving ? "저장 중..." : "저장"}
    </button>
  );

  // 전체화면 = 유저가 실제로 보는 문서 화면(DocumentViewer)과 동일한 모습으로 편집
  const fullscreenView = (
    <WysiwygEditor
      title={title}
      setTitle={setTitle}
      bodyContent={bodyContent}
      setBodyContent={setBodyContent}
      saving={saving}
      onSave={handleSave}
      onExit={() => setIsFullscreen(false)}
      onClose={onClose}
      className={fullscreenPortalTarget ? "absolute inset-0" : "fixed inset-0"}
    />
  );

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
        </div>
        <HeaderActions {...headerActionsProps} />
      </div>

      {/* Body — 전체화면 중엔 비워두고(아래 오버레이가 대신 그림) 그 외엔 평소처럼 좁은 패널에 그린다 */}
      {!isFullscreen && (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {sections}
        </div>
      )}

      {isFullscreen && (
        fullscreenPortalTarget
          ? createPortal(fullscreenView, fullscreenPortalTarget)
          : fullscreenView
      )}

      {/* Footer */}
      {!isFullscreen && (
        <div className="flex items-center justify-end px-5 py-3 bg-white border-t border-gray-200 shrink-0">
          {saveButton}
        </div>
      )}
    </div>
  );
}

function HeaderActions({
  isNew, node, nodeKind, isLocked, setIsLocked,
  confirmDelete, setConfirmDelete, onDelete,
  isFullscreen, setIsFullscreen, onClose,
}: {
  isNew: boolean;
  node: DocumentNode | null;
  nodeKind: NodeKind;
  isLocked: boolean;
  setIsLocked: (fn: (v: boolean) => boolean) => void;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  onDelete: (id: number) => Promise<void>;
  isFullscreen: boolean;
  setIsFullscreen: (fn: (v: boolean) => boolean) => void;
  onClose: () => void;
}) {
  return (
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
      {nodeKind !== "file" && (
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          title={isFullscreen ? "전체화면 종료" : "전체화면에서 편집"}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
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
  );
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {icon}
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function InfoPill({ icon, children, className }: { icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] text-gray-500 bg-gray-50 border-gray-200", className)}>
      {icon}
      {children}
    </div>
  );
}
