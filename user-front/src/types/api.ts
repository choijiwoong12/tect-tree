export interface User {
  id: string; // UUID from Supabase auth.users
  email: string;
  nickname: string;
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
