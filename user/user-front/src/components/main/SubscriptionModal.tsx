"use client";

import { DesignOverlay } from "@/components/common/DesignOverlay";
import { requestCardRegistration } from "@/lib/billing/client";
import { useAuth } from "@/components/auth/AuthProvider";

// 프레임: 메인화면 (정기구독 모달) — 구독 중 사용자가 MONTHLY SUBSCRIPTION ON 클릭 시.
// 트리 위 라이트 박스(딤 없음). 1920 디자인에 맞춰 축소(DesignOverlay). 박스 밖 클릭 시 닫힘.
// 디자인값: 박스 X652 Y81 W615.55 H237 모서리0 · 제목 X695 Y105 Sam48 · 옵션 X695 Sam27 (opt1 Y188, opt2 Y 추정).
export function SubscriptionModal({ onClose }: { onClose: () => void }) {
  const { refreshUser } = useAuth();

  // 결제수단 변경 = 카드 재등록(빌링키 교체, 청구 없음) — Toss 카드 UI로 이동
  async function handleChangeCard() {
    try {
      await requestCardRegistration("change");
    } catch (e) {
      alert((e as Error).message);
    }
  }

  // 구독 해지 = 다음 청구 중단(혜택은 만료일까지 유지)
  async function handleCancel() {
    if (!confirm("구독을 해지하시겠습니까? 남은 이용 기간까지는 계속 이용할 수 있습니다.")) return;
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "구독 해지에 실패했습니다.");
      }
      await refreshUser();
      onClose();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <DesignOverlay onClose={onClose}>
      {/* 박스 — 디자인 좌표 X652 Y81 W615.55 H237 */}
      <div
        className="absolute left-[652px] top-[81px] h-[237px] w-[615.55px] bg-[#EAEAEA] text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 제목 — 박스기준 (43,24) = 디자인 X695 Y105, Sam3KRFont 48 */}
        <div className="absolute left-[43px] top-[24px] font-pixel text-[48px] leading-none">
          MONTHLY SUBSCRIPTION
        </div>

        {/* 옵션 — X695(좌43), Sam3KRFont 27 */}
        <button
          onClick={handleChangeCard}
          className="absolute left-[43px] top-[107px] font-pixel text-[27px] leading-none transition-colors hover:text-red-600"
        >
          ( 결제수단 변경하기 )
        </button>
        <button
          onClick={handleCancel}
          className="absolute left-[43px] top-[159px] font-pixel text-[27px] leading-none transition-colors hover:text-red-600"
        >
          ( 구독 해지하기 )
        </button>
      </div>
    </DesignOverlay>
  );
}
