import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getTrustedSiteOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getTrustedSiteOrigin(request);
  const code = requestUrl.searchParams.get("code");
  const cookieStore = await cookies();
  const isPasswordRecovery = cookieStore.get("crewlab-password-recovery")?.value === "1";
  const returnPath = isPasswordRecovery ? "/auth/reset-password" : "/onboarding";
  const errorPath = isPasswordRecovery
    ? "/auth/reset-password?error=recovery"
    : "/auth/login?error=confirmation";

  if (!origin) {
    return NextResponse.json({ error: "Authentication callback is not configured." }, { status: 500 });
  }

  if (!isSupabaseConfigured() || !code) {
    cookieStore.delete("crewlab-password-recovery");
    return NextResponse.redirect(new URL(errorPath, origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    cookieStore.delete("crewlab-password-recovery");
    return NextResponse.redirect(new URL(errorPath, origin));
  }

  cookieStore.delete("crewlab-password-recovery");
  return NextResponse.redirect(new URL(returnPath, origin));
}
