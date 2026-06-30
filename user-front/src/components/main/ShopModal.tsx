"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DesignOverlay } from "@/components/common/DesignOverlay";
import { requestCardRegistration } from "@/lib/billing/client";
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
    // RP: 단건 결제(/checkout). 구독: Toss 빌링 카드 등록(requestBillingAuth) → 첫 달 청구.
    if (selected.kind === "rp") router.push(`/checkout?kind=rp&rp=${selected.rp}`);
    else requestCardRegistration("new").catch((e) => alert((e as Error).message));
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
        {/* SHOP — 박스기준 (52,50) = X634.94 Y140, Sam48 */}
        <div className="absolute left-[52px] top-[50px] font-pixel text-[48px] leading-none">SHOP</div>

        {view === "list" ? (
          <>
            {/* RP — (52,141) = Y231, Sam33 */}
            <div className="absolute left-[52px] top-[141px] font-pixel text-[33px] leading-none">RP</div>

            {/* 가격표 — Figma 박스 W628.5 H246 (52,221). 모든 행 동일 글자수 → KRW 오른쪽 끝 정렬 */}
            <div className="absolute left-[52px] top-[221px] h-[246px] w-[628.5px] font-pixel text-[27px] leading-none">
              {RP_PACKAGES.map((p) => (
                <PriceRow
                  key={p.rp}
                  active={selected?.kind === "rp" && selected.rp === p.rp}
                  line={buildLine(rpLeft(p.rp, p.bonus), priceCol(p.price))}
                  onClick={() => setSelected({ kind: "rp", rp: p.rp, bonus: p.bonus, price: p.price })}
                />
              ))}
              <div className="h-[30px]" />
              <PriceRow
                active={selected?.kind === "subscription"}
                line={buildLine("MONTHLY SUBSCRIPTION PLAN", priceCol(SUBSCRIPTION_PRICE))}
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

        {/* ( > ) 결제 화살표 — Figma 좌표 X1262 Y371 = 모달기준 (679,281), 60×34. 상품 선택 시 노출 */}
        {selected && (
          <button
            onClick={handleArrow}
            aria-label={view === "list" ? "안내 보기" : "결제로 이동"}
            className="absolute left-[679px] top-[281px] flex h-[34px] w-[60px] items-center justify-center whitespace-nowrap font-pixel text-[24px] leading-none text-black transition-colors hover:text-red-600"
          >
            {"( > )"}
          </button>
        )}
      </div>
    </DesignOverlay>
  );
}

// 가격표 행 — Sam3KRFont(ASCII 등폭) 단조폭 문자열. 모든 행을 LINE_W 글자로 패딩해 KRW 오른쪽 끝 정렬.
// 한 행 총 글자수 — 텍스트가 박스 우측 끝보다 안쪽에서 끝나(여백) 그 여백의 화살표(상대 679)와 안 겹치게
const LINE_W = 42;

// 가격 컬럼: 숫자(콤마) 우측정렬 7칸 + " KRW" = 11칸 (예: "  5,000 KRW", "500,000 KRW")
function priceCol(krwValue: number): string {
  return krwValue.toLocaleString().padStart(7) + " KRW";
}

// 좌측: 금액(콤마X) + RP [+ 보너스 BONUS]. 금액/보너스는 패딩으로 컬럼 정렬.
function rpLeft(rp: number, bonus?: number): string {
  let s = String(rp).padEnd(7) + "RP";
  if (bonus != null) s += " + " + String(bonus).padEnd(7) + "BONUS";
  return s;
}

// 좌측 + (남는 칸만큼 대시) + 우측 = 총 LINE_W 글자
function buildLine(left: string, right: string): string {
  const dashes = Math.max(2, LINE_W - left.length - right.length - 2);
  return `${left} ${"-".repeat(dashes)} ${right}`;
}

function PriceRow({ active, line, onClick }: { active: boolean; line: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`block h-[27px] whitespace-pre text-left leading-[27px] transition-colors ${active ? "text-red-600" : "text-black hover:text-red-600"}`}
    >
      {line}
    </button>
  );
}
