import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">ATHENA DOCTRINE</p>
        <h1>회원가입</h1>
        <SignupForm />
      </section>
    </main>
  );
}
