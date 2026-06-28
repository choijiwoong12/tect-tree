import { createClient } from "@supabase/supabase-js";
import type { DocumentNode, Announcement } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

export const supabase = createClient(url, key, {
  auth: { detectSessionInUrl: true, persistSession: true },
});

export async function signInWithGoogle() {
  const redirectTo =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001");
  return supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function fetchAllNodes(): Promise<DocumentNode[]> {
  const { data, error } = await supabase
    .from("document_nodes")
    .select("*")
    .order("id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchNode(id: number): Promise<DocumentNode | null> {
  const { data, error } = await supabase
    .from("document_nodes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createNode(
  payload: Omit<DocumentNode, "id" | "created_at" | "updated_at">
): Promise<DocumentNode> {
  const { data, error } = await supabase
    .from("document_nodes")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNode(
  id: number,
  payload: Partial<Omit<DocumentNode, "id">>
): Promise<DocumentNode> {
  const { data, error } = await supabase
    .from("document_nodes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNode(id: number): Promise<void> {
  const { error } = await supabase
    .from("document_nodes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function searchNodes(query: string): Promise<DocumentNode[]> {
  const { data, error } = await supabase
    .from("document_nodes")
    .select("*")
    .or(`title.ilike.%${query}%,body_content.ilike.%${query}%`)
    .order("id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ─── Announcements ───────────────────────────────────────────────────────────

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createAnnouncement(
  payload: Pick<Announcement, "title" | "content" | "sort_order" | "is_active">
): Promise<Announcement> {
  const { data, error } = await supabase
    .from("announcements")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAnnouncement(
  id: number,
  payload: Partial<Omit<Announcement, "id" | "created_at" | "updated_at">>
): Promise<Announcement> {
  const { data, error } = await supabase
    .from("announcements")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function reorderAnnouncements(
  items: { id: number; sort_order: number }[]
): Promise<void> {
  const updates = items.map(({ id, sort_order }) =>
    supabase.from("announcements").update({ sort_order }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const err = results.find((r) => r.error)?.error;
  if (err) throw err;
}
