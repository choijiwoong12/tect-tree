"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({
  onSuccess,
  onSignupClick,
  initialError = "",
}: {
  onSuccess?: () => void;
  onSignupClick?: () => void;
  initialError?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: id,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        if (onSuccess) onSuccess();
        else router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleSubmitting(true);

    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", "/");

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-5 w-full max-w-xl" onSubmit={handleSubmit}>
      <input
        autoComplete="email"
        type="email"
        value={id}
        onChange={(e) => setId(e.target.value)}
        required
        placeholder="ID"
        className="w-full bg-black border border-white/25 rounded-lg text-white px-5 py-4 font-pixel text-2xl tracking-wider placeholder:text-white/40 focus:outline-none focus:border-red-600 transition-colors"
      />

      <input
        autoComplete="current-password"
        minLength={8}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        placeholder="PASSWORD"
        className="w-full bg-black border border-white/25 rounded-lg text-white px-5 py-4 font-pixel text-2xl tracking-wider placeholder:text-white/40 focus:outline-none focus:border-red-600 transition-colors"
      />

      {/* Hidden submit so pressing Enter logs in with ID/password */}
      <button type="submit" className="sr-only" aria-hidden tabIndex={-1}>
        로그인
      </button>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={onSignupClick}
          disabled={submitting}
          className="font-pixel text-xl text-white border border-white/40 rounded-full px-8 py-3 tracking-widest hover:text-white hover:border-white transition-colors disabled:opacity-50"
        >
          {submitting ? "..." : "회원가입"}
        </button>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleSubmitting}
          className="flex items-center gap-2 bg-white text-black rounded-full px-5 py-3 text-base font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          <GoogleIcon />
          {googleSubmitting ? "Redirecting..." : "Sign in with Google"}
        </button>
      </div>

      {error ? <p className="text-red-500 font-pixel text-base mt-1">{error}</p> : null}
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
