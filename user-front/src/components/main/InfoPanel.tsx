"use client";

import type { User } from "@/types/api";
import { BUSINESS_INFO } from "@/content/business";
import { formatCallsign } from "@/lib/callsign/data";

// 정보 패널 (1920 프레임, DesignOverlay가 스케일):
// - 회원정보: 로그인 + 중앙 노드(콜사인) 클릭 토글 ON일 때 좌측(X32 Y729) 표시.
// - 사업자정보: 항상 화면 최하단 얇은 바(전폭·검은 배경) — 그래프 위에 오되 노드와 겹쳐 보이지 않음.
//   한 줄·공백 없이 "/" 구분, 이용약관/개인정보처리방침은 괄호 없는 버튼(기능 유지).
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
  onOpenTerms,
  onOpenPrivacy,
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
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onLogout?: () => void;
}) {
  // 구독중 = 구독 만료일(next_billing_date)이 아직 안 지남 (해지했어도 만료 전이면 유지)
  const subscribed = !!user?.subscribedUntil && new Date(user.subscribedUntil).getTime() > Date.now();
  const onSubscriptionClick = subscribed ? onOpenSubscriptionManage : onOpenShop;

  return (
    <>
      {user && showMember && (
        <div className="pointer-events-auto absolute left-[32px] top-[729px] z-40 h-[292px] w-[263px] font-pixel text-[21px] leading-none text-white">
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
        </div>
      )}
      <BusinessBar onOpenTerms={onOpenTerms} onOpenPrivacy={onOpenPrivacy} />
    </>
  );
}

// 사업자정보 바 — 화면 최하단 상시 표시. 프레임(1920)보다 넓은 창에서도 전폭이 되도록 좌우로 확장
// (바깥 DesignOverlay가 overflow-hidden으로 화면 끝에서 잘림). 검은 배경이라 뒤의 그래프를 가린다.
function BusinessBar({
  onOpenTerms,
  onOpenPrivacy,
}: {
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}) {
  const c = (s: string) => s.replace(/\s+/g, ""); // 예시 디자인대로 띄어쓰기 제거
  const line = [
    c(BUSINESS_INFO.name),
    `대표${c(BUSINESS_INFO.ceo)}`,
    `사업자등록번호${c(BUSINESS_INFO.bizNo)}`,
    `통신판매업신고${c(BUSINESS_INFO.mailOrderNo)}`,
    c(BUSINESS_INFO.address),
    c(BUSINESS_INFO.email),
    c(BUSINESS_INFO.phone),
  ].join("/");

  return (
    <div className="pointer-events-auto absolute bottom-0 left-[-2000px] right-[-2000px] z-40 bg-black py-[7px] text-center font-pixel text-[13px] leading-none text-white/80">
      {line}/
      <button onClick={onOpenTerms} className="cursor-pointer transition-colors hover:text-white">
        이용약관
      </button>
      /
      <button onClick={onOpenPrivacy} className="cursor-pointer transition-colors hover:text-white">
        개인정보처리방침
      </button>
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
