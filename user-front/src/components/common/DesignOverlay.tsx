"use client";

import { useEffect, useState, type ReactNode } from "react";

// 트리 위에 뜨는 모달용 오버레이.
// 1920×1080 디자인 좌표를 회원가입/콜사인처럼 뷰포트에 맞춰 축소(딤 없음 → 트리 보임).
// 가로 중앙 + 상단 기준(top-anchored)이라 네이티브 헤더 바로 아래 간격을 유지한다.
// 박스 바깥(스케일 프레임/레터박스) 클릭 시 onClose. 내부 박스는 stopPropagation 처리할 것.
const DESIGN_W = 1920;
const DESIGN_H = 1080;

export function DesignOverlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="absolute inset-0 z-[60] flex items-start justify-center overflow-hidden" onClick={onClose}>
      <div
        className="relative shrink-0"
        style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})`, transformOrigin: "top center" }}
      >
        {children}
      </div>
    </div>
  );
}
