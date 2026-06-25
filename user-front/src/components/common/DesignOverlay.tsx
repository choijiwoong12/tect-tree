"use client";

import { useEffect, useState, type ReactNode } from "react";

// 트리 위에 얹히는 1920×1080 디자인 레이어 — 뷰포트에 맞춰 비율 유지 축소(상단 기준, 가로 중앙).
// 모달/헤더/정보 패널 등 모든 오버레이 UI가 같은 스케일을 공유해 서로 어긋나지 않게 한다.
// - onClose 있음 → 모달: 박스 바깥(레이어) 클릭 시 닫힘.
// - onClose 없음 → 상시 레이어(헤더·정보): 클릭 통과(pointer-events-none), 내부 요소만 auto.
const DESIGN_W = 1920;
const DESIGN_H = 1080;

export function DesignOverlay({
  children,
  onClose,
  z = 60,
}: {
  children: ReactNode;
  onClose?: () => void;
  z?: number;
}) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      className={`absolute inset-0 flex items-start justify-center overflow-hidden ${onClose ? "" : "pointer-events-none"}`}
      style={{ zIndex: z }}
      onClick={onClose}
    >
      <div
        className="relative shrink-0"
        style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})`, transformOrigin: "top center" }}
      >
        {children}
      </div>
    </div>
  );
}
