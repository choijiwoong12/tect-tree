"use client";

// 프레임: 메인화면 (정기구독 모달) — 구독 중일 때 관리(결제수단 변경 / 구독 해지). 모달 밖 클릭 시 닫힘.
export function SubscriptionModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-neutral-100 text-black rounded px-12 py-10 w-[480px] max-w-[90vw] font-pixel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl mb-8">MONTHLY SUBSCRIPTION</h2>
        <div className="flex flex-col gap-4 text-lg items-start">
          {/* TODO: 결제수단 변경(Toss) / 구독 해지 실로직 — Supabase·Toss 연동 후 */}
          <button className="hover:text-red-600 transition-colors">( 결제수단 변경하기 )</button>
          <button className="hover:text-red-600 transition-colors">( 구독 해지하기 )</button>
        </div>
      </div>
    </div>
  );
}
