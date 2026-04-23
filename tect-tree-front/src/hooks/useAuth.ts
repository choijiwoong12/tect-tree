"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken, setTokens } from "@/lib/auth";
import type { User } from "@/types/api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<User>("/api/users/me")
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await api<{ access_token: string; refresh_token: string }>(
      "/api/auth/login",
      { method: "POST", body: { email, password } },
    );
    setTokens(tokens.access_token, tokens.refresh_token);
    const me = await api<User>("/api/users/me");
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}
