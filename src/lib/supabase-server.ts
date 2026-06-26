import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Supabase admin client — bypasses RLS. Use only in server-side admin code. */
export function createAdminClient() {
  return createClient(url, serviceKey || anonKey);
}

/** Supabase user client — respects RLS. Pass the user's Bearer token from the request. */
export function createUserClient(accessToken: string) {
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false },
  });
}

/** Extract Bearer token from Authorization header. Returns null if missing. */
export function extractToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
