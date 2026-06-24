"use client";

import { useRef, useState, useEffect, useCallback } from "react";

// 랜딩(홈페이지 로딩): 올리브 가지를 아테나에게 드래그하면 진입.
export function LandingIntro({ onEnter }: { onEnter: () => void }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [leaving, setLeaving] = useState(false);
  const dragging = useRef(false);
  const start = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const oliveRef = useRef<HTMLImageElement>(null);
  const athenaRef = useRef<HTMLImageElement>(null);
  const done = useRef(false);

  const checkReached = useCallback(() => {
    if (done.current) return;
    const o = oliveRef.current?.getBoundingClientRect();
    const a = athenaRef.current?.getBoundingClientRect();
    if (!o || !a) return;
    const ox = o.left + o.width / 2;
    const oy = o.top + o.height / 2;
    // 올리브 중심이 아테나 영역(약간 안쪽)에 들어오면 진입
    const pad = Math.min(a.width, a.height) * 0.15;
    if (ox > a.left + pad && ox < a.right - pad && oy > a.top + pad && oy < a.bottom - pad) {
      done.current = true;
      setLeaving(true);
      setTimeout(onEnter, 900);
    }
  }, [onEnter]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (done.current) return;
    dragging.current = true;
    start.current = { px: e.clientX, py: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}
  };

  useEffect(() => {
    function move(e: PointerEvent) {
      if (!dragging.current) return;
      const next = { x: start.current.ox + (e.clientX - start.current.px), y: start.current.oy + (e.clientY - start.current.py) };
      offsetRef.current = next;
      setOffset(next);
      checkReached();
    }
    function up() {
      if (!dragging.current) return;
      dragging.current = false;
      checkReached();
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [checkReached]);

  return (
    <div
      className={`absolute inset-0 bg-black overflow-hidden transition-opacity duration-700 ease-in-out ${leaving ? "opacity-0" : "opacity-100"}`}
    >
      <p className="absolute top-12 left-1/2 -translate-x-1/2 font-pixel text-xs text-white/30 tracking-[0.25em] select-none pointer-events-none">
        올리브 가지를 아테나에게
      </p>

      {/* 아테나 (우측, 고정) */}
      <div className="absolute right-[16%] top-1/2 -translate-y-1/2 pointer-events-none">
        <img
          ref={athenaRef}
          src="/assets/intro-athena.png"
          alt="Athena"
          draggable={false}
          className="h-[72vh] max-h-[720px] w-auto object-contain select-none"
        />
      </div>

      {/* 올리브 (좌측, 드래그) */}
      <div className="absolute left-[12%] top-1/2 -translate-y-1/2">
        <img
          ref={oliveRef}
          src="/assets/intro-olive.png"
          alt="올리브 가지"
          draggable={false}
          onPointerDown={onPointerDown}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          className="h-[46vh] max-h-[460px] w-auto object-contain select-none touch-none cursor-grab active:cursor-grabbing"
        />
      </div>
    </div>
  );
}
