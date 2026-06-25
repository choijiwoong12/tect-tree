"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DesignOverlay } from "@/components/common/DesignOverlay";
import { RP_PACKAGES, SUBSCRIPTION_PRICE, SUBSCRIPTION_GUIDE, RP_GUIDE } from "@/content/shop";

// 프레임: 메인화면 (SHOP 모달) — 트리 위 라이트 박스(딤 없음). 가로중앙(박스중심 ≈ X960) 상단 Y90.
// 디자인(1920=네이티브 px): 박스 X583 Y90 W755 H550 모서리0 · SHOP X634.94 Y140 Sam48(밑줄)
//   · RP X634.94 Y231 Sam33 · 가격표 X635 Y311 W628.5 Sam27 (행: 커서 올리면 빨강 + 클릭).
// 결제 2단계: (1) 상품 목록에서 선택 → ( > ) → (2) 이용 안내 → ( > ) → Toss 결제창(/checkout).
type Selected =
  | { kind: "rp"; rp: number; bonus?: number; price: number }
  | { kind: "subscription"; price: number };

export function ShopModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "guide">("list");
  const [selected, setSelected] = useState<Selected | null>(null);
  const krw = (n: number) => n.toLocaleString();

  function handleArrow() {
    if (!selected) return;
    if (view === "list") {
      setView("guide");
      return;
    }
    // 안내 → Toss 결제창. (페이지 이동 — Toss 제공 UI 노출)
    if (selected.kind === "rp") router.push(`/checkout?kind=rp&rp=${selected.rp}`);
    else router.push(`/checkout?kind=subscription`);
  }

  const guide = selected?.kind === "subscription" ? SUBSCRIPTION_GUIDE : RP_GUIDE;
  const guideTitle =
    selected?.kind === "subscription"
      ? `MONTHLY SUBSCRIPTION PLAN - ${krw(SUBSCRIPTION_PRICE)} KRW`
      : selected?.kind === "rp"
        ? `${krw(selected.rp)} RP${selected.bonus ? ` + ${krw(selected.bonus)} BONUS` : ""} - ${krw(selected.price)} KRW`
        : "";

  return (
    <DesignOverlay onClose={onClose}>
      {/* 박스 — 디자인 좌표 X583 Y90 W755 H550 (1920 프레임 기준) */}
      <div
        className="absolute left-[583px] top-[90px] h-[550px] w-[755px] bg-[#EAEAEA] text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SHOP — 박스기준 (52,50) = X634.94 Y140, Sam48, 밑줄 */}
        <div className="absolute left-[52px] top-[50px] font-pixel text-[48px] leading-none">
          <span className="inline-block border-b-[5px] border-black pb-[6px]">SHOP</span>
        </div>

        {view === "list" ? (
          <>
            {/* RP — (52,141) = Y231, Sam33 */}
            <div className="absolute left-[52px] top-[141px] font-pixel text-[33px] leading-none">RP</div>

            {/* 가격표 — (52,221) = Y311, W628.5, Sam27 */}
            <div className="absolute left-[52px] top-[221px] w-[628.5px] font-pixel text-[27px] leading-none">
              {RP_PACKAGES.map((p) => (
                <Row
                  key={p.rp}
                  active={selected?.kind === "rp" && selected.rp === p.rp}
                  amount={krw(p.rp)}
                  bonus={p.bonus}
                  price={`${krw(p.price)} KRW`}
                  onClick={() => setSelected({ kind: "rp", rp: p.rp, bonus: p.bonus, price: p.price })}
                />
              ))}
              <div className="h-[29px]" />
              <Row
                active={selected?.kind === "subscription"}
                amount="MONTHLY SUBSCRIPTION PLAN"
                wide
                price={`${krw(SUBSCRIPTION_PRICE)} KRW`}
                onClick={() => setSelected({ kind: "subscription", price: SUBSCRIPTION_PRICE })}
              />
            </div>
          </>
        ) : (
          <>
            {/* 이용 안내 — 위치/폰트 추정(디테일 대기). 선택 상품 제목 + 안내 본문 */}
            <div className="absolute left-[52px] top-[141px] font-pixel text-[27px] leading-none">{guideTitle}</div>
            <div className="absolute left-[52px] top-[210px] font-myeongjo text-[22px] font-bold">이용 안내</div>
            <div className="absolute left-[52px] top-[252px] max-h-[250px] w-[600px] overflow-y-auto font-myeongjo text-[20px] leading-relaxed">
              {guide.length === 0 ? (
                <p className="text-black/40">안내 문구 준비 중입니다.</p>
              ) : (
                guide.map((line, i) => (
                  <p key={i} className="mb-1">
                    &gt;{line}
                  </p>
                ))
              )}
            </div>
          </>
        )}

        {/* ( > ) 결제 화살표 — 우측. 상품 선택 시 노출. 목록→안내, 안내→Toss */}
        {selected && (
          <button
            onClick={handleArrow}
            aria-label={view === "list" ? "안내 보기" : "결제로 이동"}
            className="absolute right-[44px] top-[55%] -translate-y-1/2 font-pixel text-[40px] leading-none text-black transition-colors hover:text-red-600"
          >
            {"( > )"}
          </button>
        )}
      </div>
    </DesignOverlay>
  );
}

// 가격표 행 — 금액 | RP | (+ 보너스 BONUS) | 점선 리더 | 가격 KRW. hover/선택 시 빨강.
function Row({
  active,
  amount,
  bonus,
  price,
  wide,
  onClick,
}: {
  active: boolean;
  amount: string;
  bonus?: number;
  price: string;
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-[29px] w-full items-center transition-colors ${active ? "text-red-600" : "text-black hover:text-red-600"}`}
    >
      {wide ? (
        <span className="whitespace-nowrap">{amount}</span>
      ) : (
        <>
          <span className="w-[120px] shrink-0 text-left">{amount}</span>
          <span className="w-[56px] shrink-0">RP</span>
          {bonus != null && (
            <span className="flex w-[230px] shrink-0 items-center">
              <span className="w-[34px]">+</span>
              <span className="w-[100px]">{bonus.toLocaleString()}</span>
              <span>BONUS</span>
            </span>
          )}
        </>
      )}
      <span className="mx-3 flex-1 self-center border-b border-dashed border-current opacity-60" />
      <span className="w-[180px] shrink-0 whitespace-nowrap text-right">{price}</span>
    </button>
  );
}
