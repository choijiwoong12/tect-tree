"use client";

import { useState } from "react";
import { RP_PACKAGES, SUBSCRIPTION_PRICE } from "@/content/shop";

// 프레임: 메인화면 (SHOP 모달) — 표 선 없음, 점선 리더, 월구독 빨강.
// 선택은 행이 빨간색으로 표시되고, 결제 이동 화살표는 표 왼쪽에 단독·고정 위치로 1개만.
export function ShopModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const krw = (n: number) => n.toLocaleString();

  function row(id: string, left: string, price: number, red: boolean) {
    const active = selected === id;
    return (
      <button
        key={id}
        onClick={() => setSelected(id)}
        className={`w-full flex items-center py-1.5 ${red || active ? "text-red-600" : "text-black"}`}
      >
        <span className="whitespace-pre">{left}</span>
        <span className="flex-1 border-b border-dashed border-current opacity-50 mx-2" />
        <span className="whitespace-pre w-32 text-right">{krw(price)} KRW</span>
      </button>
    );
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-neutral-100 text-black rounded px-12 py-10 w-[680px] max-w-[92vw] font-pixel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl mb-8">SHOP</h2>
        <div className="text-sm mb-3 tracking-widest">RP</div>

        <div className="flex">
          {/* 좌측 단독 화살표 — 상품 선택 시 고정 위치에 1개만, 클릭 시 결제로 이동 */}
          <div className="w-14 shrink-0 flex items-center justify-center">
            {selected && (
              <button
                onClick={() => {
                  /* TODO: 결제창으로 이동 (Toss·Supabase 연동 후) */
                }}
                className="text-red-600 hover:text-red-500 text-lg"
                aria-label="결제로 이동"
              >
                {"( > )"}
              </button>
            )}
          </div>

          <div className="flex-1 text-base">
            {RP_PACKAGES.map((p) =>
              row(`rp-${p.rp}`, `${krw(p.rp)} RP${p.bonus ? `  +  ${krw(p.bonus)}  BONUS` : ""}`, p.price, false)
            )}
            <div className="h-5" />
            {row("subscription", "MONTHLY SUBSCRIPTION PLAN", SUBSCRIPTION_PRICE, true)}
          </div>
        </div>

        <p className="mt-6 text-xs text-neutral-500">상품을 선택하면 결제로 이동합니다.</p>
      </div>
    </div>
  );
}
