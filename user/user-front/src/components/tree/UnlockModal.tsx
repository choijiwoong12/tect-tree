"use client";

import { DesignOverlay } from "@/components/common/DesignOverlay";

interface UnlockModalProps {
  label: string;
  cost: number;
  rpBalance: number;
  hasSubscription?: boolean;
  onClose: () => void;
  onUnlockRP: () => void;
  onUnlockSubscription?: () => void;
  onOpenShop: () => void;
}

// 노드 열람 모달 — Figma 1920 프레임 절대좌표(패널 left583/top82, 755×512, 밝은 회색).
// 닫기 버튼 없음: 모달 밖(딤/레이어) 클릭 시 닫힘.
// RP 부족 또는 구독 미보유 상태에서 해당 버튼을 누르면 바로 SHOP으로 이동.
export function UnlockModal({
  label,
  cost,
  rpBalance,
  hasSubscription = false,
  onClose,
  onUnlockRP,
  onUnlockSubscription,
  onOpenShop,
}: UnlockModalProps) {
  const canRP = rpBalance >= cost;
  const METHOD_W = 156; // "RP로"/"구독권으로" 고정폭 → "열람하기" 세로 정렬

  return (
    <>
      {/* 배경 딤 — 클릭 시 닫힘 */}
      <div className="fixed inset-0 z-[55] bg-black/60" onClick={onClose} />

      <DesignOverlay onClose={onClose} z={60}>
        <div
          className="absolute bg-[#e8e8e8] font-pixel text-black"
          style={{ left: 583, top: 82, width: 755, height: 512 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 제목 (Figma top132 left635, 48px) */}
          <div className="absolute leading-none" style={{ left: 52, top: 50, fontSize: 48 }}>
            {label}
          </div>

          {/* 가격 (top223 left639, 33px) */}
          <div className="absolute leading-none" style={{ left: 56, top: 141, fontSize: 33 }}>
            {cost.toLocaleString()} RP
          </div>

          {/* 상태 (top303 left635, 27px) */}
          <div className="absolute leading-none" style={{ left: 52, top: 221, fontSize: 27 }}>
            <div>
              {"> MONTHLY SUBSCRIPTION "}
              {hasSubscription ? "ON" : "OFF"}
            </div>
            <div style={{ marginTop: 16 }}>
              {"> 보유 RP : "}
              {rpBalance.toLocaleString()} RP
            </div>
          </div>

          {/* 열람 버튼 (top452 left642, 27px) */}
          <div className="absolute leading-none" style={{ left: 59, top: 370, fontSize: 27 }}>
            <button
              onClick={() => (canRP ? onUnlockRP() : onOpenShop())}
              className="block whitespace-nowrap text-left transition-colors hover:text-red-600"
            >
              ({" "}
              <span className="inline-block" style={{ width: METHOD_W }}>
                RP로
              </span>
              열람하기{" "})
            </button>
            <button
              onClick={() => (hasSubscription && onUnlockSubscription ? onUnlockSubscription() : onOpenShop())}
              className="mt-[16px] block whitespace-nowrap text-left transition-colors hover:text-red-600"
            >
              ({" "}
              <span className="inline-block" style={{ width: METHOD_W }}>
                구독권으로
              </span>
              열람하기{" "})
            </button>
          </div>
        </div>
      </DesignOverlay>
    </>
  );
}
