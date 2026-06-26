import { NextResponse } from "next/server";
import { createAdminClient, CORS_HEADERS } from "@/lib/supabase-server";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("document_nodes")
    .select("id, parent_id, title, node_kind, is_locked, price, pos_x, pos_y, index_items")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json(data, { headers: CORS_HEADERS });
}
