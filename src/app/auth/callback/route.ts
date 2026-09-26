import { NextResponse } from "next/server";

import { getSiteOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getSiteOrigin(request);
  const code = requestUrl.searchParams.get("code");

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(new URL("/auth/login?error=confirmation", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=confirmation", origin));
  }

  return NextResponse.redirect(new URL("/onboarding", origin));
}
