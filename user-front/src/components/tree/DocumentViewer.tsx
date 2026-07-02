"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { DesignOverlay } from "@/components/common/DesignOverlay";

// DesignOverlay와 동일한 1920×1080 기준 스케일 계산 — 메인 TopBar와 로고 크기를 픽셀 단위로 맞추기 위해
// 헤더 영역도 같은 스케일의 DesignOverlay로 그리고, 그 실제 렌더 높이(74*scale)만큼 본문 스페이서를 확보한다.
const DESIGN_W = 1920;
const DESIGN_H = 1080;
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [readCount, setReadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => setMounted(true), []);

  useIsoLayoutEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    async function load() {
      const [contentRes, progressRes] = await Promise.all([
        fetch(`/api/nodes/content?id=${nodeId}`),
        fetch(`/api/nodes/progress?id=${nodeId}`),
      ]);
      if (!contentRes.ok) {
        const err = await contentRes.json().catch(() => ({}));
        setLoadError(
          contentRes.status === 403
            ? '열람 권한이 없습니다. (구독 만료 또는 미해금)'
            : err?.error || '문서를 불러오지 못했습니다.',
        );
        return;
      }
      const data: NodeContent = await contentRes.json();
      setContent(data);

      const items = parseIndexItems(data.index_items);
      setSections(items.length > 0 ? items : ['전체']);

      let existingReadItems: string[] = [];
      if (progressRes.ok) {
        const { read_items } = await progressRes.json() as { read_items: string[] };
        existingReadItems = read_items ?? [];
        if (read_items?.length) {
          const maxRead = Math.max(...read_items.map(Number).filter((n) => !isNaN(n)));
          setReadCount(isFinite(maxRead) ? maxRead + 1 : 0);
        }
      }

      // 방문 기록 — updated_at 갱신해 '마지막 열람 노드'로 남긴다(기존 진행도 보존).
      fetch('/api/nodes/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, readItems: existingReadItems }),
      }).catch(() => {});
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
  const railLine = isLightMode ? "bg-neutral-300" : "bg-neutral-700";
  const dotEmpty = isLightMode ? "border-neutral-400" : "border-neutral-600";
  const dotFill = isLightMode ? "bg-neutral-800 border-neutral-800" : "bg-white border-white";

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex flex-col ${bg} ${text} transition-colors duration-300`}>
      {/* 헤더 스페이서 — 실제 시각 헤더는 아래 DesignOverlay로 그려짐. 스케일 적용 실제 높이(74*scale)만큼만 공간 확보. */}
      <div style={{ height: 74 * scale }} className="shrink-0" />

      {/* 헤더(로고+빨간줄+테마토글) — 메인 TopBar와 동일한 1920 기준 스케일(DesignOverlay)로 그려 로고 크기를 정확히 맞춘다.
          빨간 줄은 로고/토글 뒤(아래)로 가도록 z-index 없이 둠. */}
      <DesignOverlay z={110}>
        <div className="pointer-events-none absolute left-0 right-0 top-[37px] h-px bg-[#FE0000]" />
        <button
          onClick={onClose}
          title="메인으로 나가기"
          className="pointer-events-auto absolute left-[28px] top-[37px] -translate-y-1/2 cursor-pointer font-pixel text-[27px] leading-none whitespace-nowrap"
        >
          ATHENA DOCTRINE
        </button>
        <button
          onClick={() => setIsLightMode((v) => !v)}
          aria-label="테마 전환"
          className={`pointer-events-auto absolute right-[21px] top-[37px] -translate-y-1/2 inline-flex h-[22px] w-[42px] items-center rounded-full ${isLightMode ? "bg-neutral-400" : "bg-neutral-600"}`}
        >
          <span
            className={`inline-block h-[14px] w-[14px] rounded-full bg-white transition-transform duration-200 ${isLightMode ? "translate-x-[24px]" : "translate-x-[4px]"}`}
          />
        </button>
      </DesignOverlay>

      {/* 본문(넓게) + 우측 목차 레일(토글 바로 아래, 우측 끝 절대배치) */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto scrollbar-hide">
          <div className="mx-auto w-full max-w-[1720px] py-10 pl-10 pr-24 md:pl-16 md:pr-36">
            {content ? (
              <>
                <h1 className="font-pixel text-4xl md:text-5xl text-red-600 tracking-wider mb-12 break-keep">
                  {content.title}
                </h1>
                <div
                  className="document-body font-myeongjo text-[20px] md:text-[22px] leading-loose break-keep [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-4 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_hr]:border-neutral-600 [&_hr]:my-6"
                  dangerouslySetInnerHTML={{ __html: content.body_content ?? '' }}
                />
              </>
            ) : loadError ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <p className="font-pixel text-sm text-red-500">{loadError}</p>
                <button onClick={onClose} className="font-pixel text-xs text-white/60 underline">
                  닫기
                </button>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="h-2 w-2 animate-ping rounded-full bg-red-500" />
              </div>
            )}
            <div className="h-[40vh]" aria-hidden />
          </div>
        </div>

        {/* 우측 목차 레일 — 헤더 토글(right-21, w-42) 바로 아래에 정렬 */}
        {sections.length > 0 && (
          <div className="pointer-events-none absolute right-[21px] top-0 bottom-0 flex w-[42px] flex-col items-center py-12">
            <div className={`absolute left-1/2 top-12 bottom-12 w-px -translate-x-1/2 ${railLine}`} />
            <div className="relative flex h-full flex-col justify-between">
              {sections.map((title, i) => (
                <button
                  key={i}
                  onClick={() => jumpTo(i)}
                  title={title}
                  aria-label={`${title}로 이동`}
                  className={`pointer-events-auto h-[14px] w-[14px] rounded-full border transition-colors ${i < readCount ? dotFill : `bg-transparent ${dotEmpty}`}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
