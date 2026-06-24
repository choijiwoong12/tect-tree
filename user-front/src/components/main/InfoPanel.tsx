"use client";

import type { User } from "@/types/api";
import { BUSINESS_INFO } from "@/content/business";

// 좌하단 패널: 기본 = 사업자 정보. 로그인 + 중앙 노드 클릭(showMember) 시 = 회원 정보 (같은 자리 토글).
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
  const isMember = !!user && showMember;
  const subscribed = false; // TODO: 실제 구독 상태 연동
  const onSubscriptionClick = subscribed ? onOpenSubscriptionManage : onOpenShop;

  return (
    <div className="absolute bottom-6 left-6 z-40 font-pixel text-white text-xs leading-relaxed max-w-sm pointer-events-auto">
      <div className="border border-white/25 bg-black/40 rounded px-5 py-4">
        {isMember ? (
          <MemberInfo
            user={user as User}
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
    <div>
      <div className="text-white/45 tracking-widest mb-2">사업자 정보</div>
      <div>{BUSINESS_INFO.name}</div>
      <div>대표 {BUSINESS_INFO.ceo}</div>
      <div>사업자등록번호 {BUSINESS_INFO.bizNo}</div>
      <div>통신판매업신고 {BUSINESS_INFO.mailOrderNo}</div>
      <div className="text-white/70">{BUSINESS_INFO.address}</div>
      <div className="text-white/70">
        {BUSINESS_INFO.email} · {BUSINESS_INFO.phone}
      </div>
      {/* TODO: 약관/개인정보 모달 또는 페이지 연결 */}
      <div className="mt-2 text-red-500">( 이용약관 )&nbsp;&nbsp;( 개인정보처리방침 )</div>
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
    <div>
      <div className="text-red-500">[ {callSign} ]</div>
      <div className="mt-2">CLEARANCE : LEVEL 1</div>
      <div>LAST NODE : -</div>
      <div>PROGRESS : 0 %</div>
      <div>RP : {(user.rp_balance ?? 0).toLocaleString()}</div>
      <button onClick={onSubscriptionClick} className="block text-left hover:text-white/70 transition-colors">
        MONTHLY SUBSCRIPTION OFF
      </button>
      <div className="mt-2 flex gap-3 text-red-500">
        <button onClick={onOpenCustomerService} className="hover:text-red-400 transition-colors">( CUSTOMER SERVICE )</button>
        {/* TODO: NOTICE 모달 */}
        <button className="hover:text-red-400 transition-colors">( NOTICE )</button>
      </div>
    </div>
  );
}
