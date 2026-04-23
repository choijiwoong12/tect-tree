export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // TODO: 관리자 가드 — role !== "admin" 이면 /login 으로
  return (
    <section style={{ padding: 48 }}>
      <nav style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <a href="/admin">대시보드</a>
        <a href="/admin/users">회원</a>
        <a href="/admin/payments">결제</a>
        <a href="/admin/tree-editor">트리 편집</a>
      </nav>
      {children}
    </section>
  );
}
