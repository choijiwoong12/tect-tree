"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Megaphone,
  Eye,
  EyeOff,
} from "lucide-react";
import clsx from "clsx";
import type { Announcement } from "@/lib/types";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  reorderAnnouncements,
} from "@/lib/supabase";

export default function AnnouncementManager() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // draft fields
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftActive, setDraftActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAnnouncements();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function selectItem(item: Announcement) {
    setSelected(item);
    setDraftTitle(item.title);
    setDraftContent(item.content);
    setDraftActive(item.is_active);
    setDirty(false);
  }

  function markDirty() { setDirty(true); }

  async function handleAdd() {
    setSaving(true);
    try {
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order), -1);
      const created = await createAnnouncement({
        title: "새 공지사항",
        content: "",
        sort_order: maxOrder + 1,
        is_active: true,
      });
      const next = [...items, created];
      setItems(next);
      selectItem(created);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateAnnouncement(selected.id, {
        title: draftTitle,
        content: draftContent,
        is_active: draftActive,
      });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelected(updated);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("이 공지사항을 삭제할까요?")) return;
    await deleteAnnouncement(id);
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    if (selected?.id === id) {
      setSelected(null);
      setDirty(false);
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((item, i) => ({ ...item, sort_order: i }));
    setItems(reordered);

    await reorderAnnouncements(reordered.map(({ id, sort_order }) => ({ id, sort_order })));
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* List panel */}
      <div className="flex flex-col w-72 min-w-[200px] border-r border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            공지사항 목록
          </span>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Plus size={12} />
            추가
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <Megaphone size={24} className="opacity-40" />
              <p className="text-xs">공지사항이 없습니다</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {items.map((item, idx) => (
                <li
                  key={item.id}
                  className={clsx(
                    "group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors",
                    selected?.id === item.id
                      ? "bg-blue-50 border-l-2 border-blue-500"
                      : "hover:bg-gray-50 border-l-2 border-transparent"
                  )}
                  onClick={() => selectItem(item)}
                >
                  {/* order buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMove(idx, -1); }}
                      disabled={idx === 0}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-20"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMove(idx, 1); }}
                      disabled={idx === items.length - 1}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-20"
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={clsx(
                      "text-sm font-medium truncate",
                      selected?.id === item.id ? "text-blue-700" : "text-gray-800"
                    )}>
                      {item.title || "(제목 없음)"}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                      {item.content ? item.content.slice(0, 40) : "내용 없음"}
                    </p>
                  </div>

                  {!item.is_active && (
                    <EyeOff size={11} className="shrink-0 text-gray-300" />
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="shrink-0 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Editor panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F7FA]">
        {selected ? (
          <>
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">ID #{selected.id}</span>
                <button
                  onClick={() => {
                    setDraftActive((v) => !v);
                    markDirty();
                  }}
                  className={clsx(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    draftActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {draftActive ? <Eye size={11} /> : <EyeOff size={11} />}
                  {draftActive ? "공개" : "비공개"}
                </button>
              </div>
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={12} />
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    제목
                  </label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => { setDraftTitle(e.target.value); markDirty(); }}
                    placeholder="공지사항 제목"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    내용
                  </label>
                  <textarea
                    value={draftContent}
                    onChange={(e) => { setDraftContent(e.target.value); markDirty(); }}
                    placeholder="공지사항 내용을 입력하세요..."
                    rows={16}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none leading-relaxed"
                  />
                </div>

                {dirty && (
                  <p className="text-xs text-amber-500">저장되지 않은 변경사항이 있습니다.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
            <Megaphone size={36} className="opacity-20" />
            <p className="text-sm">공지사항을 선택하거나 새로 추가하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
