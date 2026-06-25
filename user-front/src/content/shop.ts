// SHOP 상품 — 출처: docs/content/business-info.md (SHOP 프레임 기준)
export interface RpPackage {
  rp: number;
  bonus?: number;
  price: number; // KRW
}

export const RP_PACKAGES: RpPackage[] = [
  { rp: 500, price: 5000 },
  { rp: 1000, price: 10000 },
  { rp: 3000, bonus: 300, price: 30000 },
  { rp: 5000, bonus: 750, price: 50000 },
  { rp: 10000, bonus: 2000, price: 100000 },
  { rp: 20000, bonus: 6000, price: 200000 },
  { rp: 50000, bonus: 20000, price: 500000 },
];

export const SUBSCRIPTION_PRICE = 33000; // 월 정기구독 (KRW)

// 결제 안내 문구 — 결제 화살표 1차 클릭 시 노출(이용 안내). 출처: SHOP(정기구독 안내) 프레임.
export const SUBSCRIPTION_GUIDE: string[] = [
  "월간 구독은 결제일로부터 1개월 동안 모든 노드를 열람할 수 있는 이용권입니다.",
  "별도의 해지 신청이 없는 경우 매월 자동으로 갱신되며, 등록된 결제수단으로 정기 결제가 진행됩니다.",
  "구독 기간 중에는 노드를 자유롭게 열람할 수 있으나, 구독 기간이 종료되면 해당 권한으로 열람하던 노드는 더 이상 열람할 수 없습니다.",
  "단, RP를 사용하여 개별 구매한 노드는 구독 종료 여부와 관계없이 계속 열람할 수 있습니다.",
  "구독 종료 후에도 계속 열람을 원할 경우, 구독을 갱신하거나 해당 노드를 RP로 개별 구매해야 합니다.",
  "자동갱신을 원하지 않는 경우, 다음 결제 예정일 전까지 구독 해지 신청을 완료해야 합니다. 해지 신청 후에도 이미 결제된 이용 기간이 남아 있는 경우 해당 기간 종료일까지 구독 혜택을 이용할 수 있습니다.",
];

// RP 충전 안내 문구 — 아직 미전달. 전달받으면 채울 것(빈 배열이면 "준비 중" 표시).
export const RP_GUIDE: string[] = [];
