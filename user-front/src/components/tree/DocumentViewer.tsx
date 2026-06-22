"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DocumentViewerProps {
  label: string;
  onClose: () => void;
}

export function DocumentViewer({ label, onClose }: DocumentViewerProps) {
  const [mounted, setMounted] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 40;

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => setIsLightMode((prev) => !prev);
  
  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // 모드별 테마 클래스 지정
  const bgClass = isLightMode ? "bg-[#f8f9fa]" : "bg-[#0a0a0a]";
  const textClass = isLightMode ? "text-neutral-900" : "text-neutral-100";
  const borderClass = isLightMode ? "border-neutral-300" : "border-neutral-700";
  const mutedTextClass = isLightMode ? "text-neutral-400" : "text-neutral-600";
  const hoverTextClass = isLightMode ? "hover:text-neutral-600" : "hover:text-neutral-300";
  const hoverBorderClass = isLightMode ? "hover:border-neutral-400" : "hover:border-neutral-500";
  const toggleBgClass = isLightMode ? "bg-neutral-400" : "bg-neutral-600";

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex flex-col ${bgClass} ${textClass} transition-colors duration-300 overflow-hidden`}
    >
      {/* Top Header: 사이트 이름 및 닫기 버튼 */}
      <div className="flex justify-center items-center py-10">
        <button
          onClick={onClose}
          className={`font-pixel text-xl tracking-[0.2em] transition-colors ${mutedTextClass} ${hoverTextClass}`}
          title="메인으로 나가기"
        >
          ATHENA DOCTRINE
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-8 md:px-16 flex relative">
        {/* Left Arrow */}
        <div className="absolute left-0 inset-y-0 flex items-center">
          <button
            onClick={handlePrev}
            disabled={currentPage === 1}
            className={`p-2 rounded-full border transition-all ${
              currentPage === 1
                ? "opacity-20 cursor-not-allowed border-transparent"
                : `${borderClass} ${mutedTextClass} ${hoverTextClass} ${hoverBorderClass}`
            }`}
          >
            <ChevronLeft size={28} strokeWidth={1} />
          </button>
        </div>

        {/* Text Content Container */}
        <div className="flex-1 px-12 md:px-24 overflow-y-auto pb-10 custom-scrollbar">
          <h2 className="text-2xl font-bold mb-12 tracking-wide break-keep">
            {label}
          </h2>
          
          {/* Dummy Content - 추후 Supabase 연동 */}
          <div className="space-y-8 leading-loose text-[15px] md:text-base opacity-90 break-keep">
            <p>
              여기에 추후 Supabase에서 불러온 실제 텍스트 데이터가 들어갈 예정입니다.
              현재는 페이지 레이아웃과 디자인 프레임만 완성되어 있으며, 내용은 임시로 채워져 있습니다.
            </p>
            <p>
              좌우 화살표를 클릭하면 페이지가 넘어가는 액션을 테스트해볼 수 있으며,
              하단의 테마 스위치를 클릭하면 제공된 피그마 디자인과 같이 라이트 모드와 다크 모드가 실시간으로 전환됩니다.
            </p>
            <p>
              또한 상단의 <b>ATHENA DOCTRINE</b> 로고를 클릭하면 즉시 뷰어를 종료하고 원래의 테크 트리 메인 화면으로 빠져나갑니다.
              이 뷰어 컴포넌트는 트리 화면 위를 완전히 덮는 전체 화면 오버레이 형태로 렌더링됩니다.
            </p>
          </div>
        </div>

        {/* Right Arrow */}
        <div className="absolute right-0 inset-y-0 flex items-center">
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-full border transition-all ${
              currentPage === totalPages
                ? "opacity-20 cursor-not-allowed border-transparent"
                : `${borderClass} ${mutedTextClass} ${hoverTextClass} ${hoverBorderClass}`
            }`}
          >
            <ChevronRight size={28} strokeWidth={1} />
          </button>
        </div>
      </div>

      {/* Bottom Footer: 테마 스위치 & 페이지네이션 */}
      <div className="py-8 px-12 md:px-24 flex justify-end items-center gap-5">
        {/* Theme Toggle Switch */}
        <button
          onClick={toggleTheme}
          aria-label="테마 전환"
          className={`relative inline-flex h-[22px] w-[42px] items-center rounded-full transition-colors focus:outline-none ${toggleBgClass}`}
        >
          <span
            className={`inline-block h-[14px] w-[14px] transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
              isLightMode ? "translate-x-[24px]" : "translate-x-[4px]"
            }`}
          />
        </button>

        {/* Page Counter */}
        <span className={`font-pixel text-[15px] tracking-[0.15em] ${mutedTextClass}`}>
          {currentPage} / {totalPages}
        </span>
      </div>
    </div>,
    document.body
  );
}
