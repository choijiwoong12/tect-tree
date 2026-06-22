"use client";

import { useRouter } from "next/navigation";

interface UnlockModalProps {
  label: string;
  cost: number;
  rpBalance: number;
  status: "unlocked" | "unlockable";
  onClose: () => void;
  onUnlock: () => void;
}

export function UnlockModal({
  label,
  cost,
  rpBalance,
  status,
  onClose,
  onUnlock,
}: UnlockModalProps) {
  const router = useRouter();
  const insufficient = rpBalance < cost;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="athena-corner-frame relative bg-black/90 border border-white/10 px-12 py-10 w-[420px] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="corner-bl" />
        <span className="corner-br" />

        <p className="font-pixel text-xl text-white tracking-widest mb-8">
          [ {label} ]
        </p>

        <div className="space-y-2 mb-8">
          <p className="font-pixel text-lg text-white tracking-wider">
            필요 RP : <span className={insufficient ? "text-red-500" : "text-white"}>{cost} RP</span>
          </p>
          <p className="font-pixel text-lg text-white tracking-wider">
            보유 RP : <span className={insufficient ? "text-red-500" : "text-emerald-400"}>{rpBalance} RP</span>
          </p>
        </div>

        {insufficient ? (
          <button
            onClick={() => router.push("/store")}
            className="font-pixel text-lg text-red-500 hover:text-red-400 tracking-widest transition-colors"
          >
            {"> RP 충전"}
          </button>
        ) : (
          <button
            onClick={onUnlock}
            className="font-pixel text-lg text-red-500 hover:text-red-400 tracking-widest transition-colors"
          >
            {"> 해금하기"}
          </button>
        )}
      </div>
    </div>
  );
}
