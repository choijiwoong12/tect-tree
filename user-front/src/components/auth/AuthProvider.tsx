"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import type { User } from "@/types/api";

async function loadUser(
  supabase: ReturnType<typeof createClient>,
  session: Session,
): Promise<User | null> {
  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const { data: profile } = await supabase.from("users").select("*").eq("id", session.user.id).single();

  // DB row가 아직 없으면(첫 로그인 직후 등) 세션 데이터로 fallback
  if (!profile) {
    return {
      id: session.user.id,
      email: session.user.email ?? '',
      nickname: (meta.nickname as string) ?? (meta.name as string) ?? session.user.email?.split('@')[0] ?? 'user',
      name: (meta.name as string) || undefined,
      callsign: (meta.callsign as string) || undefined,
      rp_balance: 0,
      profile_image_url: (meta.avatar_url ?? meta.picture ?? null) as string | null,
      created_at: session.user.created_at,
      subscribedUntil: null,
    };
  }

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("next_billing_date")
    .eq("user_id", session.user.id)
    .order("next_billing_date", { ascending: false })
    .limit(1);

  return {
    ...(profile as User),
    name: (meta.name as string | undefined) || undefined,
    callsign: (meta.callsign as string | undefined) || undefined,
    subscribedUntil: (subs?.[0]?.next_billing_date as string | undefined) ?? null,
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const setRpBalance = useAppStore((s) => s.setRpBalance);

  useEffect(() => {
    if (user) setRpBalance(user.rp_balance ?? 0);
  }, [user, setRpBalance]);

  useEffect(() => {
    let mounted = true;

    // 5초 내에 INITIAL_SESSION이 안 오면 로그아웃으로 처리
    const failsafe = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    // INITIAL_SESSION 포함해서 모든 auth 이벤트 처리 — refresh 시 세션 유지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(failsafe);
        try {
          if (session) {
            const merged = await loadUser(supabase, session);
            if (mounted) setUser(merged);
          } else {
            if (mounted) setUser(null);
          }
        } catch (err) {
          console.error("Auth state change error:", err);
          if (mounted) setUser(null);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUser(null); return; }
    setUser(await loadUser(supabase, session));
  }, [supabase]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, [supabase]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
