import { NextResponse } from "next/server";

import { getTrustedSiteOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getTrustedSiteOrigin(request);
  const code = requestUrl.searchParams.get("code");

  if (!origin) {
    return NextResponse.json({ error: "Authentication callback is not configured." }, { status: 500 });
  }

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
