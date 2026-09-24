import { NextResponse } from "next/server";
import { createUserClient, extractToken, CORS_HEADERS } from "@/lib/supabase-server";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** GET /api/progress?node_id=123
 *  Returns the reading progress for the authenticated user on a specific node.
 */
export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const nodeId = parseInt(searchParams.get("node_id") ?? "", 10);
  if (isNaN(nodeId)) {
    return NextResponse.json({ error: "node_id required" }, { status: 400, headers: CORS_HEADERS });
  }

  const supabase = createUserClient(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const { data, error } = await supabase
    .from("reading_progress")
    .select("read_items, updated_at")
    .eq("node_id", nodeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json(data ?? { read_items: [], updated_at: null }, { headers: CORS_HEADERS });
}

/** POST /api/progress
 *  Body: { node_id: number, read_items: string[] }
 *  Upserts progress for the authenticated user.
 */
export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const supabase = createUserClient(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const body = await req.json() as { node_id?: number; read_items?: string[] };
  if (!body.node_id || !Array.isArray(body.read_items)) {
    return NextResponse.json({ error: "node_id and read_items required" }, { status: 400, headers: CORS_HEADERS });
  }

  const { data, error } = await supabase
    .from("reading_progress")
    .upsert(
      {
        user_id: user.id,
        node_id: body.node_id,
        read_items: body.read_items,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,node_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json(data, { headers: CORS_HEADERS });
}
