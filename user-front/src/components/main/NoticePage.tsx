"use client";

import { useState } from "react";
import { DesignFrame } from "@/components/common/DesignFrame";
import { TopBar } from "@/components/common/TopBar";
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from "@/content/legal";

// 프레임: 공지사항(속보) — 회원정보 ( N O T I C E ) 클릭 시 진입. 좌측 메뉴 + 우측 내용(스크롤).
// 로고 클릭 → 메인으로 복귀. 1920 디자인에 맞춰 축소(DesignFrame).
// 디자인: 제목 "속보" X132 Y158 Sam64 · 메뉴 X132 Y360 Sam32(선택 빨강) · 내용 X971 Y222 W841 H754 NanumMyeongjo25 우측정렬.
const LETTERHEAD = "ATHENA DOCTRINE\n0000\nWELCOME TO THE CAMPAIGN";

// 문서 첫 블록(제목+시행일자)을 떼고 본문만 추출
function bodyOf(doc: string) {
  return doc.split("\n\n").slice(1).join("\n\n");
}

const ITEMS = [
  { id: "caution", label: "주의사항", title: "주의사항", body: "현재 등록된 주의사항이 없습니다." },
  { id: "terms", label: "이용약관", title: "이용약관", body: bodyOf(TERMS_OF_SERVICE) },
  { id: "privacy", label: "개인정보처리방침", title: "개인정보 처리방침", body: bodyOf(PRIVACY_POLICY) },
] as const;

export function NoticePage({ rp, onClose }: { rp?: number; onClose: () => void }) {
  const [sel, setSel] = useState<string>("caution");
  const item = ITEMS.find((i) => i.id === sel) ?? ITEMS[0];
  const content = `${LETTERHEAD}\n\n${item.title}\n\n${item.body}`;

  return (
    <div className="absolute inset-0 z-[100]">
      <DesignFrame>
        {/* 헤더 — 로고 클릭 시 메인으로 */}
        <TopBar rp={rp ?? 0} onLogoClick={onClose} />

        {/* 제목 속보 */}
        <h1 className="absolute left-[132px] top-[158px] font-pixel text-[64px] leading-none text-white">속보</h1>

        {/* 좌측 메뉴 — 선택 시 빨강 */}
        <div className="absolute left-[132px] top-[360px] flex flex-col gap-[18px] font-pixel text-[32px]">
          {ITEMS.map((i) => (
            <button
              key={i.id}
              onClick={() => setSel(i.id)}
              className={`text-left transition-colors ${sel === i.id ? "text-[#FE0000]" : "text-white hover:text-white/70"}`}
            >
              ( {i.label} )
            </button>
          ))}
        </div>

        {/* 우측 내용 — 우측정렬, 스크롤 */}
        <div className="absolute left-[971px] top-[222px] h-[754px] w-[841px] overflow-y-auto">
          <pre className="whitespace-pre-wrap break-words text-right font-myeongjo text-[25px] leading-relaxed text-white">
{content}
          </pre>
        </div>
      </DesignFrame>
    </div>
  );
}
