"use client";

import { BUSINESS_INFO } from "@/content/business";

// 프레임: 메인화면 (고객센터 모달). 모달 밖 클릭 시 닫힘.
export function CustomerServiceModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-neutral-100 text-black rounded px-12 py-10 w-[520px] max-w-[90vw] font-pixel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl mb-6">고객센터</h2>
        <p className="text-base">{BUSINESS_INFO.email}</p>
        <p className="text-base mb-6">{BUSINESS_INFO.phone}</p>
        <p className="text-sm leading-relaxed text-neutral-700">
          빠른 확인과 정확한 응대를 위해
          <br />
          가급적 이메일 문의를 권장드립니다.
        </p>
      </div>
    </div>
  );
}
