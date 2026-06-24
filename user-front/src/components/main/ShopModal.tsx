"use client";

import { useState } from "react";
import { RP_PACKAGES, SUBSCRIPTION_PRICE } from "@/content/shop";

// 프레임: 메인화면 (SHOP 모달) — RP 패키지 + 월 정기구독. 모달 밖 클릭 시 닫힘.
export function ShopModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const krw = (n: number) => n.toLocaleString();

  function handleSelect(id: string) {
    setSelected(id);
    // TODO: 선택 후 결제 — RP는 토스 결제, 구독은 결제수단 등록(Toss). Supabase 키 연동 후.
  }

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-neutral-100 text-black rounded px-12 py-10 w-[640px] max-w-[90vw] font-pixel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl mb-8">SHOP</h2>

        <div className="text-sm mb-2 tracking-widest">RP</div>
        <div className="border border-black/20 rounded divide-y divide-black/10">
          {RP_PACKAGES.map((p) => {
            const id = `rp-${p.rp}`;
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-black/5 transition-colors ${
                  selected === id ? "text-red-600" : ""
                }`}
              >
                <span>
                  {krw(p.rp)} RP{p.bonus ? ` + ${krw(p.bonus)} BONUS` : ""}
                </span>
                <span className="flex items-center gap-3">
                  {krw(p.price)} KRW
                  {selected === id ? <span aria-hidden>{"( > )"}</span> : null}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => handleSelect("subscription")}
            className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-black/5 transition-colors ${
              selected === "subscription" ? "text-red-600" : ""
            }`}
          >
            <span>MONTHLY SUBSCRIPTION PLAN</span>
            <span className="flex items-center gap-3">
              {krw(SUBSCRIPTION_PRICE)} KRW
              {selected === "subscription" ? <span aria-hidden>{"( > )"}</span> : null}
            </span>
          </button>
        </div>

        <p className="mt-4 text-xs text-neutral-500">상품을 선택하면 결제로 이동합니다.</p>
      </div>
    </div>
  );
}
