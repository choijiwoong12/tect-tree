import { NextResponse } from "next/server";
import { createAdminClient, CORS_HEADERS } from "@/lib/supabase-server";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400, headers: CORS_HEADERS });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("document_nodes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json(data, { headers: CORS_HEADERS });
}
