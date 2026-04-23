// Keep in sync with back/app/schemas/*.py

export type Role = "user" | "admin";

export interface User {
  id: number;
  email: string;
  nickname: string;
  role: Role;
  rp_balance: number;
  profile_image_url: string | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface RpTransaction {
  id: number;
  delta: number;
  balance_after: number;
  kind: "charge" | "unlock" | "admin_adjust" | "refund";
  reference_id: string | null;
  memo: string | null;
  created_at: string;
}

export interface Payment {
  id: number;
  order_id: string;
  amount: number;
  rp_amount: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  created_at: string;
}
