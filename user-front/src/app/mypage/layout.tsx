export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  // TODO: 인증 가드 — 미로그인 시 /login 으로 리다이렉트
  return (
    <section style={{ padding: 48 }}>
      <nav style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <a href="/mypage">개요</a>
        <a href="/mypage/profile">프로필</a>
        <a href="/mypage/rp">RP 충전</a>
        <a href="/mypage/payments">결제 내역</a>
      </nav>
      {children}
    </section>
  );
}
