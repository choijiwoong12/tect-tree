"use client";

import { useEffect, useState, type ReactNode } from "react";

// Figma 디자인(1920×1080) 절대좌표 화면을 어떤 뷰포트든 비율 그대로 축소해 꽉 맞게 보여준다.
const DESIGN_W = 1920;
const DESIGN_H = 1080;

export function DesignFrame({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center">
      <div
        className="relative shrink-0"
        style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})`, transformOrigin: "center" }}
      >
        {children}
      </div>
    </div>
  );
}
