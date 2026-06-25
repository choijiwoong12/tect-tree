"use client";

import Link from "next/link";
import type { User } from "@/types/api";
import { BUSINESS_INFO } from "@/content/business";

// 좌하단 패널:
// - 로그인 전: 사업자 정보(표시의무).
// - 로그인 후: 회원 정보. 중앙 노드 클릭으로 on/off 토글(showMember). off면 숨김.
//   사업자 정보는 토글이 아니라 별도 페이지(/business)에서 열람.
export function InfoPanel({
  user,
  showMember,
  onOpenCustomerService,
  onOpenShop,
  onOpenSubscriptionManage,
}: {
  user: User | null;
  showMember: boolean;
  onOpenCustomerService?: () => void;
  onOpenShop?: () => void;
  onOpenSubscriptionManage?: () => void;
}) {
  // 로그인 + 토글 off → 패널 숨김
  if (user && !showMember) return null;

  const subscribed = false; // TODO: 실제 구독 상태 연동
  const onSubscriptionClick = subscribed ? onOpenSubscriptionManage : onOpenShop;

  return (
    <div className="absolute bottom-6 left-6 z-40 font-pixel text-white text-sm leading-tight max-w-sm pointer-events-auto">
      <div className="bg-black rounded px-6 py-4">
        {user ? (
          <MemberInfo
            user={user}
            onOpenCustomerService={onOpenCustomerService}
            onSubscriptionClick={onSubscriptionClick}
          />
        ) : (
          <BusinessInfo />
        )}
      </div>
    </div>
  );
}

function BusinessInfo() {
  return (
    <div className="text-white/45">
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
  onSubscriptionClick,
}: {
  user: User;
  onOpenCustomerService?: () => void;
  onSubscriptionClick?: () => void;
}) {
  // TODO: 콜사인/등급/직전노드/진행률/구독상태는 users 스키마 확장 + 노드 연동 후 실제 값으로.
  const callSign = user.nickname || "YOU";
  return (
    <div className="text-white">
      <div className="mb-4">[ {callSign} ]</div>
      
      <div className="flex">
        <span className="w-28 shrink-0">CLEARANCE</span>
        <span>: LEVEL 1</span>
      </div>
      <div className="flex">
        <span className="w-28 shrink-0">LAST NOD</span>
        <span>: -</span>
      </div>
      <div className="flex">
        <span className="w-28 shrink-0"></span>
        <span>: </span>
      </div>
      <div className="flex mb-4">
        <span className="w-28 shrink-0">PROGRESS</span>
        <span>: 0.00 %</span>
      </div>

      <div className="flex mb-1">
        <span className="w-28 shrink-0">RP</span>
        <span>: {(user.rp_balance ?? 0).toLocaleString()}</span>
      </div>
      <button onClick={onSubscriptionClick} className="block text-left hover:text-white/70 transition-colors mb-5">
        MONTHLY SUBSCRIPTION OFF
      </button>

      <div className="flex flex-col gap-1">
        <button onClick={onOpenCustomerService} className="text-left hover:text-white/70 transition-colors">
          ( CUSTOMER SERVICE )
        </button>
        {/* TODO: NOTICE 모달 */}
        <button className="text-left hover:text-white/70 transition-colors">
          ( N O T I C E )
        </button>
        <Link href="/business" className="text-white text-left hover:text-white/70 transition-colors">
          ( 사업자 정보 )
        </Link>
      </div>
    </div>
  );
}
