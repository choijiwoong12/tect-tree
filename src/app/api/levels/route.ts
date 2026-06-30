import { NextResponse } from "next/server";
import { createAdminClient, CORS_HEADERS } from "@/lib/supabase-server";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tree_levels")
    .select("id, name, center_x, center_y, radius_x, radius_y, color")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json(data, { headers: CORS_HEADERS });
}
