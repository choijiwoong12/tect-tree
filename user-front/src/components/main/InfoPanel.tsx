"use client";

import type { User } from "@/types/api";
import { BUSINESS_INFO } from "@/content/business";
import { formatCallsign } from "@/lib/callsign/data";

// 좌하단 정보 패널 — 디자인: 회원정보 X46 Y729 W263 H292 (1920 프레임, DesignOverlay가 스케일).
// - 로그인 전: 사업자 정보(표시의무).
// - 로그인 후: 회원 정보. 중앙 노드 클릭으로 on/off 토글(showMember). off면 숨김.
// 하단 버튼: ( CUSTOMER SERVICE ) / ( N O T I C E ) / [ LOG OUT ].
export function InfoPanel({
  user,
  showMember,
  lastNode,
  progress = 0,
  onLastNodeClick,
  onEditCallsign,
  onOpenCustomerService,
  onOpenNotice,
  onOpenShop,
  onOpenSubscriptionManage,
  onLogout,
}: {
  user: User | null;
  showMember: boolean;
  lastNode?: { id: number; title: string } | null;
  progress?: number;
  onLastNodeClick?: () => void;
  onEditCallsign?: () => void;
  onOpenCustomerService?: () => void;
  onOpenNotice?: () => void;
  onOpenShop?: () => void;
  onOpenSubscriptionManage?: () => void;
  onLogout?: () => void;
}) {
  // 로그인 + 토글 off → 패널 숨김
  if (user && !showMember) return null;

  // 구독중 = 구독 만료일(next_billing_date)이 아직 안 지남 (해지했어도 만료 전이면 유지)
  const subscribed = !!user?.subscribedUntil && new Date(user.subscribedUntil).getTime() > Date.now();
  const onSubscriptionClick = subscribed ? onOpenSubscriptionManage : onOpenShop;

  return (
    <div
      className={
        "pointer-events-auto absolute left-[46px] z-40 font-pixel text-white " +
        // 로그인: 회원정보(X46 Y729). 로그아웃: 사업자 정보는 좌하단 구석으로.
        (user ? "top-[729px] h-[292px] w-[263px] text-[21px] leading-none" : "bottom-[24px] w-[440px]")
      }
    >
      {user ? (
        <MemberInfo
          user={user}
          subscribed={subscribed}
          lastNode={lastNode}
          progress={progress}
          onLastNodeClick={onLastNodeClick}
          onEditCallsign={onEditCallsign}
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
  subscribed,
  lastNode,
  progress = 0,
  onLastNodeClick,
  onEditCallsign,
  onOpenCustomerService,
  onOpenNotice,
  onSubscriptionClick,
  onLogout,
}: {
  user: User;
  subscribed?: boolean;
  lastNode?: { id: number; title: string } | null;
  progress?: number;
  onLastNodeClick?: () => void;
  onEditCallsign?: () => void;
  onOpenCustomerService?: () => void;
  onOpenNotice?: () => void;
  onSubscriptionClick?: () => void;
  onLogout?: () => void;
}) {
  // 콜사인-이름 — 콜사인은 표시용으로 재배열("AEE11" → "EE-A11"). 예: "EE-A11-GODOT".
  // TODO: 등급/직전노드/진행률/구독상태는 users 스키마 확장 + 노드 연동 후 실제 값으로.
  const display =
    [user.callsign ? formatCallsign(user.callsign) : null, user.name].filter(Boolean).join("-") ||
    user.nickname ||
    "YOU";
  const rp = (user.rp_balance ?? 0).toLocaleString();
  // 박스(X46 Y729) 기준 절대좌표. 하단 버튼은 디자인 정확값: CS top212(Y941), NOTICE top231(Y960), LOG OUT top271(Y1000), W216.
  // 상단 정보 Y는 패널 미제공 → 행피치 19 / 그룹간격 43으로 버튼과 정렬되게 추정.
  return (
    <>
      {/* 콜사인-이름 — 클릭 시 콜사인 재설정(동의 화면 건너뛰고 콜사인 단계만, 기존 선택 빨강) */}
      <button onClick={onEditCallsign} className="absolute left-0 top-[6px] text-left transition-colors hover:text-white/70">
        [ {display} ]
      </button>

      <div className="absolute left-0 top-[50px]">
        <span className="inline-block w-[112px]">CLEARANCE</span>: LEVEL 1
      </div>
      {/* LAST NOD — 마지막 열람 노드. 클릭 시 해당 노드를 그래프 중앙으로 이동 */}
      <div className="absolute left-0 top-[69px] flex w-full items-baseline">
        <span className="inline-block w-[112px] shrink-0">LAST NOD</span>
        <span className="shrink-0">:&nbsp;</span>
        {lastNode ? (
          <button
            onClick={onLastNodeClick}
            title={lastNode.title}
            className="min-w-0 truncate text-left transition-colors hover:text-white/70"
          >
            {lastNode.title}
          </button>
        ) : (
          <span>-</span>
        )}
      </div>
      <div className="absolute left-0 top-[88px]">
        <span className="inline-block w-[112px]" />:
      </div>
      <div className="absolute left-0 top-[107px]">
        <span className="inline-block w-[112px]">PROGRESS</span>: {progress.toFixed(2)} %
      </div>

      <div className="absolute left-0 top-[150px]">
        <span className="inline-block w-[112px]">RP</span>: {rp}
      </div>
      <button onClick={onSubscriptionClick} className="absolute left-0 top-[169px] text-left transition-colors hover:text-white/70">
        MONTHLY SUBSCRIPTION {subscribed ? "ON" : "OFF"}
      </button>

      {/* 하단 버튼 — 디자인 정확값. NOTICE/LOG OUT은 자간으로 W216 채움 */}
      <button onClick={onOpenCustomerService} className="absolute left-0 top-[212px] whitespace-nowrap text-left transition-colors hover:text-white/70">
        ( CUSTOMER SERVICE )
      </button>
      <button onClick={onOpenNotice} className="absolute left-0 top-[231px] whitespace-nowrap text-left tracking-[0.56em] transition-colors hover:text-white/70">
        ( NOTICE )
      </button>
      <button onClick={onLogout} className="absolute left-0 top-[271px] whitespace-nowrap text-left tracking-[0.46em] transition-colors hover:text-red-500">
        [ LOG OUT ]
      </button>
    </>
  );
}
