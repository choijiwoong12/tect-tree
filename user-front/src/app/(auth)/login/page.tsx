import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">ATHENA DOCTRINE</p>
        <h1>로그인</h1>
        <LoginForm initialError={searchParams?.error ?? ""} />
      </section>
    </main>
  );
}
