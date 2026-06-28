"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface DocumentViewerProps {
  nodeId: number;
  onClose: () => void;
}

interface NodeContent {
  title: string;
  body_content: string | null;
  index_items: unknown;
}

function parseIndexItems(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) =>
      typeof item === 'string' ? item : (item as Record<string, string>)?.title ?? String(item)
    );
  }
  return [];
}

export function DocumentViewer({ nodeId, onClose }: DocumentViewerProps) {
  const [mounted, setMounted] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [content, setContent] = useState<NodeContent | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [readCount, setReadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    async function load() {
      const [contentRes, progressRes] = await Promise.all([
        fetch(`/api/nodes/content?id=${nodeId}`),
        fetch(`/api/nodes/progress?id=${nodeId}`),
      ]);
      if (!contentRes.ok) return;
      const data: NodeContent = await contentRes.json();
      setContent(data);

      const items = parseIndexItems(data.index_items);
      setSections(items.length > 0 ? items : ['전체']);

      if (progressRes.ok) {
        const { read_items } = await progressRes.json() as { read_items: string[] };
        if (read_items?.length) {
          const maxRead = Math.max(...read_items.map(Number).filter((n) => !isNaN(n)));
          setReadCount(isFinite(maxRead) ? maxRead + 1 : 0);
        }
      }
    }
    load();
  }, [nodeId]);

  // 스크롤 → 읽은 섹션 계산 + debounced 저장
  const saveProgress = useCallback(
    (count: number, sectionList: string[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const readItems = Array.from({ length: count }, (_, i) => String(i));
        fetch('/api/nodes/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId, readItems }),
        }).catch(() => {});
        void sectionList; // suppress unused warning
      }, 800);
    },
    [nodeId]
  );

  function handleScroll() {
    const c = containerRef.current;
    if (!c || sections.length === 0) return;
    const progress = (c.scrollTop + c.clientHeight) / c.scrollHeight;
    const newCount = Math.min(sections.length, Math.ceil(progress * sections.length));
    if (newCount > readCount) {
      setReadCount(newCount);
      saveProgress(newCount, sections);
    }
  }

  function jumpTo(i: number) {
    const c = containerRef.current;
    if (!c || sections.length === 0) return;
    const target = (i / sections.length) * c.scrollHeight;
    c.scrollTo({ top: target, behavior: 'smooth' });
  }

  const bg = isLightMode ? "bg-[#f5f5f5]" : "bg-[#0a0a0a]";
  const text = isLightMode ? "text-neutral-900" : "text-neutral-100";
  const muted = isLightMode ? "text-neutral-500" : "text-neutral-400";
  const railLine = isLightMode ? "bg-neutral-300" : "bg-neutral-700";
  const dotEmpty = isLightMode ? "border-neutral-400" : "border-neutral-600";
  const dotFill = isLightMode ? "bg-neutral-800 border-neutral-800" : "bg-white border-white";

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex flex-col ${bg} ${text} transition-colors duration-300`}>
      {/* 헤더 */}
      <div className="relative h-[74px] shrink-0">
        <div className="absolute left-0 right-0 top-[37px] h-px bg-[#FE0000]" />
        <button
          onClick={onClose}
          title="메인으로 나가기"
          className="absolute left-[28px] top-[37px] -translate-y-1/2 font-pixel text-[27px] leading-none whitespace-nowrap"
        >
          ATHENA DOCTRINE
        </button>
        <button
          onClick={() => setIsLightMode((v) => !v)}
          aria-label="테마 전환"
          className={`absolute right-[21px] top-[37px] -translate-y-1/2 inline-flex h-[22px] w-[42px] items-center rounded-full ${isLightMode ? "bg-neutral-400" : "bg-neutral-600"}`}
        >
          <span
            className={`inline-block h-[14px] w-[14px] rounded-full bg-white transition-transform duration-200 ${isLightMode ? "translate-x-[24px]" : "translate-x-[4px]"}`}
          />
        </button>
      </div>

      {/* 본문 + 우측 목차 레일 */}
      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto px-8 md:px-16 flex gap-8">
        <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-10 pr-4">
          {content ? (
            <>
              <h1 className="font-pixel text-4xl md:text-5xl text-red-600 tracking-wider mb-12 break-keep">
                {content.title}
              </h1>
              <div className="leading-loose text-[15px] md:text-base break-keep whitespace-pre-wrap">
                {content.body_content ?? ''}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-2 w-2 animate-ping rounded-full bg-red-500" />
            </div>
          )}
          <div className="h-[40vh]" aria-hidden />
        </div>

        {/* 우측 목차 레일 */}
        {sections.length > 0 && (
          <div className="relative w-8 shrink-0 flex flex-col items-center py-10">
            <div className={`absolute top-10 bottom-10 w-px ${railLine}`} />
            <div className="relative flex flex-col justify-between h-full">
              {sections.map((title, i) => (
                <button
                  key={i}
                  onClick={() => jumpTo(i)}
                  title={title}
                  aria-label={`${title}로 이동`}
                  className={`w-3 h-3 rounded-full border transition-colors ${i < readCount ? dotFill : `bg-transparent ${dotEmpty}`}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`shrink-0 py-4 px-6 text-right font-pixel text-xs ${muted}`}>
        {readCount} / {sections.length}
      </div>
    </div>,
    document.body,
  );
}
