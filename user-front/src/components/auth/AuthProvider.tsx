"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import type { User } from "@/types/api";

// users 테이블 프로필 + auth user_metadata(이름/콜사인)를 합쳐 User로.
// (users 테이블에 name/callsign 컬럼이 없어도 동작하도록 metadata에 저장)
function mergeProfile(profile: unknown, session: Session): User | null {
  if (!profile) return null;
  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    ...(profile as User),
    name: (meta.name as string | undefined) || undefined,
    callsign: (meta.callsign as string | undefined) || undefined,
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

  // Keep the RP balance store in sync with the authenticated user's DB value.
  // (Previously this lived only in Header, which is never mounted, so the
  // store stayed at 0 and topped-up RP never showed up.)
  useEffect(() => {
    if (user) setRpBalance(user.rp_balance ?? 0);
  }, [user, setRpBalance]);

  useEffect(() => {
    let mounted = true;

    // Safety net: never block the UI on a slow/unreachable Supabase.
    // If auth init hasn't resolved within 5s, fall back to logged-out state.
    const failsafe = setTimeout(() => {
      if (mounted) {
        setLoading((prev) => {
          if (prev) console.warn("Auth init timed out; continuing as logged-out");
          return false;
        });
      }
    }, 5000);

    async function initializeAuth() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (mounted) {
          setUser(mergeProfile(profile, session));
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return;
        
        try {
          if (session) {
            const { data: profile, error } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single();
            if (mounted) {
              setUser(!error ? mergeProfile(profile, session) : null);
            }
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

  // Re-fetch the current user's profile (e.g. after an RP top-up) so the
  // balance reflects the latest DB value without a full page reload.
  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUser(null);
      return;
    }
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setUser(mergeProfile(profile, session));
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
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
