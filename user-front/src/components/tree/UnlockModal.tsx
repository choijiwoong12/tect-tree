"use client";

// 프레임: 메인화면 (노드열람 모달) — RP로 열람 / 구독권으로 열람. 부족·무구독 시 SHOP.
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

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-neutral-100 text-black rounded px-12 py-10 w-[460px] max-w-[90vw] font-pixel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl mb-6">{label}</h2>
        <p className="text-xl mb-5">{cost.toLocaleString()} RP</p>

        <p className="text-sm mb-1">{"> MONTHLY SUBSCRIPTION "}{hasSubscription ? "ON" : "OFF"}</p>
        <p className="text-sm mb-8">{"> 보유 RP : "}{rpBalance.toLocaleString()} RP</p>

        <div className="flex flex-col gap-3 items-start text-lg">
          <button
            onClick={() => (canRP ? onUnlockRP() : onOpenShop())}
            className="hover:text-red-600 transition-colors"
          >
            ( RP로 열람하기 )
          </button>
          <button
            onClick={() => (hasSubscription && onUnlockSubscription ? onUnlockSubscription() : onOpenShop())}
            className="hover:text-red-600 transition-colors"
          >
            ( 구독권으로 열람하기 )
          </button>
        </div>

        <p className="mt-6 text-xs text-neutral-500">
          RP가 부족하거나 구독권이 없으면 SHOP으로 이동합니다.
        </p>
      </div>
    </div>
  );
}
