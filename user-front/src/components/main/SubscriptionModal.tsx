"use client";

// 프레임: 메인화면 (정기구독 모달) — 구독 중 사용자가 MONTHLY SUBSCRIPTION ON 클릭 시.
// 트리 위에 라이트 박스로 뜸(딤 없음 → 트리 그대로 보임). 박스 밖 클릭 시 닫힘.
// 디자인값(1920 = 네이티브 px): 박스 X652 Y81 W615.55 H237 모서리0 · 가로중심 ≈ X960(화면중앙) 상단 Y81.
//   제목 X695 Y105 Sam3KRFont 48 · 옵션 X695 Sam3KRFont 27 (opt1 Y188, opt2 Y는 패널 미제공 → 추정).
export function SubscriptionModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[60]" onClick={onClose}>
      <div
        className="absolute left-1/2 top-[81px] h-[237px] w-[615.55px] -translate-x-1/2 bg-[#EAEAEA] text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 제목 — 박스기준 (43,24) = 디자인 X695 Y105, Sam3KRFont 48 */}
        <div className="absolute left-[43px] top-[24px] font-pixel text-[48px] leading-none">
          MONTHLY SUBSCRIPTION
        </div>

        {/* 옵션 — X695(좌43), Sam3KRFont 27 */}
        {/* TODO: 결제수단 변경(Toss billing) / 구독 해지 실로직 — Supabase·Toss 연동 후 */}
        <button className="absolute left-[43px] top-[107px] font-pixel text-[27px] leading-none transition-colors hover:text-red-600">
          ( 결제수단 변경하기 )
        </button>
        <button className="absolute left-[43px] top-[159px] font-pixel text-[27px] leading-none transition-colors hover:text-red-600">
          ( 구독 해지하기 )
        </button>
      </div>
    </div>
  );
}
