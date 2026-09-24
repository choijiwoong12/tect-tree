import { createClient } from "@supabase/supabase-js";
import type { DocumentNode, NodeEdge, Announcement, TreeLevel } from "./types";

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

// ─── Edges ───────────────────────────────────────────────────────────────────

export async function fetchAllEdges(): Promise<NodeEdge[]> {
  const { data, error } = await supabase
    .from("node_edges")
    .select("*")
    .order("id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createEdge(sourceId: number, targetId: number): Promise<NodeEdge> {
  const { data, error } = await supabase
    .from("node_edges")
    .insert({ source_id: sourceId, target_id: targetId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEdge(id: number): Promise<void> {
  const { error } = await supabase
    .from("node_edges")
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

// ─── Settings ────────────────────────────────────────────────────────────────

export interface GraphViewport { x: number; y: number; zoom: number }

export async function fetchGraphViewport(): Promise<GraphViewport | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "graph_viewport")
    .single();
  if (error) return null;
  return data?.value as GraphViewport ?? null;
}

export async function saveGraphViewport(viewport: GraphViewport): Promise<void> {
  const { error } = await supabase
    .from("settings")
    .upsert(
      { key: "graph_viewport", value: viewport, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (error) throw error;
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

// ─── Tree levels (boundaries) ─────────────────────────────────────────────────

export async function fetchAllLevels(): Promise<TreeLevel[]> {
  const { data, error } = await supabase
    .from("tree_levels")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createLevel(
  payload: Pick<TreeLevel, "name" | "center_x" | "center_y" | "radius_x" | "radius_y" | "color">
): Promise<TreeLevel> {
  const { data, error } = await supabase
    .from("tree_levels")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLevel(
  id: number,
  payload: Partial<Omit<TreeLevel, "id" | "created_at" | "updated_at">>
): Promise<TreeLevel> {
  const { data, error } = await supabase
    .from("tree_levels")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLevel(id: number): Promise<void> {
  const { error } = await supabase
    .from("tree_levels")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
