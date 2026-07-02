"use client";

import { useEffect, useState } from "react";
import { DesignFrame } from "@/components/common/DesignFrame";
import { TopBar } from "@/components/common/TopBar";
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from "@/content/legal";

// 프레임: 공지사항(속보) — 회원정보 ( N O T I C E ) 클릭 시 진입. 좌측 메뉴 + 우측 내용(스크롤).
// 로고 클릭 → 메인으로 복귀. 1920 디자인에 맞춰 축소(DesignFrame).
// 디자인: 제목 "속보" X132 Y158 Sam64 · 메뉴 X132 Y360 Sam32(선택 빨강) · 내용 X971 Y222 W841 H754 NanumMyeongjo25 우측정렬.
//
// variant="legal": 사업자정보의 ( 이용약관 )/( 개인정보처리방침 ) 버튼 진입용 — "속보" 타이틀과
// "주의사항" 메뉴 항목을 뺀 축소판. 나머지 레이아웃/스타일은 동일하게 재사용한다.
//
// 주의사항 = 어드민 announcements(공지사항) 실데이터(/api/notices, is_active만 sort_order순).
const LETTERHEAD = "ATHENA DOCTRINE\n0000\nWELCOME TO THE CAMPAIGN";

// 문서 첫 블록(제목+시행일자)을 떼고 본문만 추출
function bodyOf(doc: string) {
  return doc.split("\n\n").slice(1).join("\n\n");
}

interface Notice {
  id: number;
  title: string;
  content: string;
}

const STATIC_ITEMS = [
  { id: "terms" as const, label: "이용약관", title: "이용약관", body: bodyOf(TERMS_OF_SERVICE) },
  { id: "privacy" as const, label: "개인정보처리방침", title: "개인정보 처리방침", body: bodyOf(PRIVACY_POLICY) },
];

type ItemId = "caution" | (typeof STATIC_ITEMS)[number]["id"];

interface NoticePageProps {
  rp?: number;
  onClose: () => void;
  variant?: "notice" | "legal";
  initialSelect?: ItemId;
}

// 여러 공지사항을 하나의 스크롤 본문으로 이어붙임(제목 + 내용, 항목 사이 빈 줄)
function joinNotices(notices: Notice[]): string {
  if (notices.length === 0) return "현재 등록된 주의사항이 없습니다.";
  return notices.map((n) => `${n.title}\n\n${n.content}`).join("\n\n\n");
}

export function NoticePage({ rp, onClose, variant = "notice", initialSelect = "caution" }: NoticePageProps) {
  const [notices, setNotices] = useState<Notice[] | null>(null);

  // legal 변형에서는 주의사항을 아예 안 보여주므로 굳이 불러올 필요 없음
  useEffect(() => {
    if (variant === "legal") return;
    fetch("/api/notices")
      .then((r) => (r.ok ? r.json() : { notices: [] }))
      .then((d) => setNotices(d.notices ?? []))
      .catch(() => setNotices([]));
  }, [variant]);

  const items =
    variant === "legal"
      ? STATIC_ITEMS
      : [
          { id: "caution" as const, label: "주의사항", title: "주의사항", body: notices === null ? "" : joinNotices(notices) },
          ...STATIC_ITEMS,
        ];

  const [sel, setSel] = useState<ItemId>(initialSelect);
  const item = items.find((i) => i.id === sel) ?? items[0];
  const content = `${LETTERHEAD}\n\n${item.title}\n\n${item.body}`;

  return (
    <div className="absolute inset-0 z-[100]">
      <DesignFrame>
        {/* 헤더 — 로고 클릭 시 메인으로 */}
        <TopBar rp={rp ?? 0} onLogoClick={onClose} />

        {/* 제목 속보 — legal 변형에서는 표시하지 않음 */}
        {variant === "notice" && (
          <h1 className="absolute left-[132px] top-[158px] font-pixel text-[64px] leading-none text-white">속보</h1>
        )}

        {/* 좌측 메뉴 — 선택 시 빨강 */}
        <div className="absolute left-[132px] top-[360px] flex flex-col gap-[18px] font-pixel text-[32px]">
          {items.map((i) => (
            <button
              key={i.id}
              onClick={() => setSel(i.id)}
              className={`text-left transition-colors ${sel === i.id ? "text-[#FE0000]" : "text-white hover:text-white/70"}`}
            >
              ( {i.label} )
            </button>
          ))}
        </div>

        {/* 우측 내용 — 우측정렬, 스크롤(네이티브 스크롤바 숨김) */}
        <div className="absolute left-[971px] top-[222px] h-[754px] w-[841px] overflow-y-auto scrollbar-hide">
          <pre className="whitespace-pre-wrap break-words text-right font-myeongjo text-[25px] leading-relaxed text-white">
{content}
          </pre>
        </div>
      </DesignFrame>
    </div>
  );
}
