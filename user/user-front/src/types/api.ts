export interface User {
  id: string; // UUID from Supabase auth.users
  email: string;
  nickname: string;
  name?: string; // 회원가입 입력 이름 (auth user_metadata)
  callsign?: string; // 콜사인 (auth user_metadata)
  subscribedUntil?: string | null; // 구독 혜택 만료일(subscriptions.next_billing_date). 지나지 않았으면 구독중
  rp_balance: number;
  profile_image_url: string | null;
  created_at: string;
}

export interface RpTransaction {
  id: string;
  delta: number;
  balance_after: number;
  kind: "charge" | "unlock" | "refund";
  reference_id: string | null;
  memo: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  rp_amount: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  created_at: string;
}
