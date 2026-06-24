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
