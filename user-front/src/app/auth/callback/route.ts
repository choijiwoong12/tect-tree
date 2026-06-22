import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const authError = requestUrl.searchParams.get("error_description");

  if (authError) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", authError);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }

    if (data.user) {
      const metadata = data.user.user_metadata ?? {};
      const nickname =
        metadata.nickname ??
        metadata.name ??
        metadata.full_name ??
        data.user.email?.split("@")[0] ??
        "user";

      await supabaseAdmin.from("users").upsert(
        {
          id: data.user.id,
          email: data.user.email ?? "",
          nickname,
          profile_image_url: metadata.avatar_url ?? metadata.picture ?? null,
        },
        { onConflict: "id" }
      );
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
