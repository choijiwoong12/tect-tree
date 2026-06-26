"use client";

import type { User } from "@/types/api";
import { BUSINESS_INFO } from "@/content/business";

// 좌하단 정보 패널 — 디자인: 회원정보 X46 Y729 W263 H292 (1920 프레임, DesignOverlay가 스케일).
// - 로그인 전: 사업자 정보(표시의무).
// - 로그인 후: 회원 정보. 중앙 노드 클릭으로 on/off 토글(showMember). off면 숨김.
// 하단 버튼: ( CUSTOMER SERVICE ) / ( N O T I C E ) / [ LOG OUT ].
export function InfoPanel({
  user,
  showMember,
  onOpenCustomerService,
  onOpenNotice,
  onOpenShop,
  onOpenSubscriptionManage,
  onLogout,
}: {
  user: User | null;
  showMember: boolean;
  onOpenCustomerService?: () => void;
  onOpenNotice?: () => void;
  onOpenShop?: () => void;
  onOpenSubscriptionManage?: () => void;
  onLogout?: () => void;
}) {
  // 로그인 + 토글 off → 패널 숨김
  if (user && !showMember) return null;

  const subscribed = false; // TODO: 실제 구독 상태 연동
  const onSubscriptionClick = subscribed ? onOpenSubscriptionManage : onOpenShop;

  return (
    <div className="pointer-events-auto absolute left-[46px] top-[729px] w-[263px] z-40 font-pixel text-[16px] leading-normal text-white">
      {user ? (
        <MemberInfo
          user={user}
          onOpenCustomerService={onOpenCustomerService}
          onOpenNotice={onOpenNotice}
          onSubscriptionClick={onSubscriptionClick}
          onLogout={onLogout}
        />
      ) : (
        <BusinessInfo />
      )}
    </div>
  );
}

function BusinessInfo() {
  return (
    <div className="text-[13px] leading-relaxed text-white/45">
      <div>{BUSINESS_INFO.name}</div>
      <div>대표 {BUSINESS_INFO.ceo}</div>
      <div>사업자등록번호 {BUSINESS_INFO.bizNo}</div>
      <div>통신판매업신고 {BUSINESS_INFO.mailOrderNo}</div>
      <div>{BUSINESS_INFO.address}</div>
      <div>
        {BUSINESS_INFO.email} · {BUSINESS_INFO.phone}
      </div>
      <div className="mt-2">( 이용약관 )&nbsp;&nbsp;( 개인정보처리방침 )</div>
    </div>
  );
}

function MemberInfo({
  user,
  onOpenCustomerService,
  onOpenNotice,
  onSubscriptionClick,
  onLogout,
}: {
  user: User;
  onOpenCustomerService?: () => void;
  onOpenNotice?: () => void;
  onSubscriptionClick?: () => void;
  onLogout?: () => void;
}) {
  // 콜사인-이름 형태로 표시(둘 다 있으면 "콜사인-이름", 하나만 있으면 그것, 없으면 닉네임).
  // TODO: 등급/직전노드/진행률/구독상태는 users 스키마 확장 + 노드 연동 후 실제 값으로.
  const display = [user.callsign, user.name].filter(Boolean).join("-") || user.nickname || "YOU";
  return (
    <div className="text-white">
      {/* 콜사인-이름 — TODO: 클릭 시 콜사인 수정 */}
      <div className="mb-3">[ {display} ]</div>

      <div className="flex">
        <span className="w-[100px] shrink-0">CLEARANCE</span>
        <span>: LEVEL 1</span>
      </div>
      {/* LAST NOD — TODO: 직전 열람 노드, 클릭 시 해당 노드로 이동 */}
      <div className="flex">
        <span className="w-[100px] shrink-0">LAST NOD</span>
        <span>: -</span>
      </div>
      <div className="flex">
        <span className="w-[100px] shrink-0" />
        <span>:</span>
      </div>
      <div className="mb-3 flex">
        <span className="w-[100px] shrink-0">PROGRESS</span>
        <span>: 0.00 %</span>
      </div>

      <div className="flex">
        <span className="w-[100px] shrink-0">RP</span>
        <span>: {(user.rp_balance ?? 0).toLocaleString()}</span>
      </div>
      <button onClick={onSubscriptionClick} className="mb-3 block text-left transition-colors hover:text-white/70">
        MONTHLY SUBSCRIPTION OFF
      </button>

      <div className="flex flex-col gap-1">
        <button onClick={onOpenCustomerService} className="text-left transition-colors hover:text-white/70">
          ( CUSTOMER SERVICE )
        </button>
        <button onClick={onOpenNotice} className="text-left transition-colors hover:text-white/70">
          ( N O T I C E )
        </button>
      </div>

      {/* LOG OUT — 헤더에 있던 로그아웃을 회원정보 하단으로 이동 */}
      <button onClick={onLogout} className="mt-3 block text-left transition-colors hover:text-red-500">
        [ LOG OUT ]
      </button>
    </div>
  );
}
