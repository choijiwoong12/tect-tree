"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface DocumentViewerProps {
  label: string;
  onClose: () => void;
}

// 프레임: node_viewer (다크/화이트) + 스크롤디테일
// - 제목(빨강) + 부제 + 본문, 다크/화이트 토글, 우측 스크롤=목차 레일(읽으면 원 채움, 클릭 시 이동)
// - 헤더 로고 클릭 → 메인(트리)으로 복귀
// TODO: 제목/부제/본문/목차는 어드민 document_nodes(body_content 등) 연동 후 실제 값으로.
const SECTIONS = [
  { title: "서장", body: "여기에 추후 어드민 document_nodes에서 불러온 본문(body_content)이 들어갑니다. 현재는 레이아웃·인터랙션 확인용 임시 텍스트입니다." },
  { title: "1장", body: "스크롤을 내리면 우측 목차 레일의 동그라미가 읽은 지점까지 차오릅니다. 마치 게임의 자동 세이브 포인트처럼 진행 위치를 표시합니다." },
  { title: "2장", body: "우측 목차의 동그라미를 클릭하면 해당 위치로 즉시 이동합니다. 본문은 고정 폰트로 표시되며 영역 안에서 스크롤됩니다." },
  { title: "3장", body: "상단의 토글로 다크 모드와 화이트 모드를 전환할 수 있습니다. 헤더의 ATHENA DOCTRINE 로고를 누르면 트리 메인으로 빠져나갑니다." },
  { title: "종장", body: "실제 서비스에서는 노드별로 서로 다른 분량의 문서가 들어가며, 목차 섹션 수도 문서에 따라 달라집니다." },
];

export function DocumentViewer({ label, onClose }: DocumentViewerProps) {
  const [mounted, setMounted] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [readCount, setReadCount] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => setMounted(true), []);

  function handleScroll() {
    const c = containerRef.current;
    if (!c) return;
    const mid = c.scrollTop + c.clientHeight * 0.35;
    let count = 0;
    sectionRefs.current.forEach((el) => {
      if (el && el.offsetTop <= mid) count++;
    });
    setReadCount(Math.max(1, count));
  }

  function jumpTo(i: number) {
    const el = sectionRefs.current[i];
    const c = containerRef.current;
    if (el && c) c.scrollTo({ top: el.offsetTop, behavior: "smooth" });
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
      {/* 헤더: 빨간선 관통 로고(좌) + 다크/화이트 토글(우) */}
      <div className="relative h-16 shrink-0">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-red-600" />
        <div className="absolute inset-0 flex items-center justify-between px-6">
          <button
            onClick={onClose}
            title="메인으로 나가기"
            className="font-pixel text-xl tracking-[0.15em] leading-none drop-shadow-md"
          >
            ATHENA DOCTRINE
          </button>
          <button
            onClick={() => setIsLightMode((v) => !v)}
            aria-label="테마 전환"
            className={`relative inline-flex h-[22px] w-[42px] items-center rounded-full ${isLightMode ? "bg-neutral-400" : "bg-neutral-600"}`}
          >
            <span
              className={`inline-block h-[14px] w-[14px] rounded-full bg-white transition-transform duration-200 ${isLightMode ? "translate-x-[24px]" : "translate-x-[4px]"}`}
            />
          </button>
        </div>
      </div>

      {/* 본문 + 우측 목차 레일 */}
      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto px-8 md:px-16 flex gap-8">
        <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-10 pr-4">
          <h1 className="font-pixel text-4xl md:text-5xl text-red-600 tracking-wider mb-3 break-keep">{label}</h1>
          <p className={`text-base md:text-lg mb-12 ${isLightMode ? "text-emerald-700" : "text-emerald-400"} break-keep`}>
            인간 의식의 탄생을 추동한 존재론적 이정표
          </p>

          <div className="space-y-12 leading-loose text-[15px] md:text-base break-keep">
            {SECTIONS.map((s, i) => (
              <div
                key={i}
                ref={(el) => {
                  sectionRefs.current[i] = el;
                }}
              >
                <p>{s.body}</p>
              </div>
            ))}
            <div className="h-[40vh]" aria-hidden />
          </div>
        </div>

        {/* 우측 목차 레일 */}
        <div className="relative w-8 shrink-0 flex flex-col items-center py-10">
          <div className={`absolute top-10 bottom-10 w-px ${railLine}`} />
          <div className="relative flex flex-col justify-between h-full">
            {SECTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => jumpTo(i)}
                aria-label={`섹션 ${i + 1}로 이동`}
                className={`w-3 h-3 rounded-full border transition-colors ${i < readCount ? dotFill : `bg-transparent ${dotEmpty}`}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={`shrink-0 py-4 px-6 text-right font-pixel text-xs ${muted}`}>
        {readCount} / {SECTIONS.length}
      </div>
    </div>,
    document.body,
  );
}
