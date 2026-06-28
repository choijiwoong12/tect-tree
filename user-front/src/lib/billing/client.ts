"use client";

import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { createClient } from "@/lib/supabase/client";

// 결제수단 등록(빌링 인증) — Toss 카드 등록 UI로 이동. 성공 시 /billing/success 로 리다이렉트.
// 신규 통합 키(test_gck/live_gck)와 호환되는 @tosspayments/tosspayments-sdk(v2) 사용.
// mode: 'new' = 신규 구독(첫 달 즉시 청구), 'change' = 결제수단 변경(청구 없이 빌링키만 교체).
export async function requestCardRegistration(mode: "new" | "change" = "new") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) throw new Error("Toss 클라이언트 키가 설정되지 않았습니다.");

  const tossPayments = await loadTossPayments(clientKey);
  const payment = tossPayments.payment({ customerKey: user.id });
  await payment.requestBillingAuth({
    method: "CARD",
    successUrl: `${window.location.origin}/billing/success?mode=${mode}`,
    failUrl: `${window.location.origin}/billing/fail`,
    customerEmail: user.email ?? undefined,
  });
}
