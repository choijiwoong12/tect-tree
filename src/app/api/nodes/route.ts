import { NextResponse } from "next/server";
import { createAdminClient, CORS_HEADERS } from "@/lib/supabase-server";
import { findRootNode, resolveNodeLevel } from "@/lib/utils";
import type { DocumentNode } from "@/lib/types";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const supabase = createAdminClient();

  const [{ data: nodes, error: nodesError }, { data: levels, error: levelsError }] = await Promise.all([
    supabase
      .from("document_nodes")
      .select("id, parent_id, title, node_kind, is_locked, price, pos_x, pos_y, index_items")
      .order("id", { ascending: true }),
    supabase
      .from("tree_levels")
      .select("id, name, radius, color")
      .order("radius", { ascending: true }),
  ]);

  if (nodesError) {
    return NextResponse.json({ error: nodesError.message }, { status: 500, headers: CORS_HEADERS });
  }
  if (levelsError) {
    return NextResponse.json({ error: levelsError.message }, { status: 500, headers: CORS_HEADERS });
  }

  const root = findRootNode((nodes ?? []) as DocumentNode[]);
  const withLevels = (nodes ?? []).map((node) => {
    const level = resolveNodeLevel(node as DocumentNode, root, levels ?? []);
    return { ...node, level_id: level?.id ?? null, level_name: level?.name ?? null };
  });

  return NextResponse.json(withLevels, { headers: CORS_HEADERS });
}
