import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/config";

const protectedPaths = ["/home", "/profile", "/onboarding", "/projects", "/my-crew", "/my-projects", "/applications", "/discussion", "/github", "/u"];
const authPaths = ["/auth", "/auth/login", "/auth/signup"];
const onboardingGatedPaths = ["/home", "/profile", "/projects", "/my-crew", "/my-projects", "/applications", "/discussion", "/github", "/u"];

function matchesPath(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const { url, key } = getSupabaseConfig();
  const pathname = request.nextUrl.pathname;

  if (!url || !key) {
    if (matchesPath(pathname, protectedPaths)) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let user: User | null;
  try {
    const { data, error } = await supabase.auth.getUser();
    // Proxy is an optimistic gate. A failed check must be resolved again by
    // the protected Server Component, not converted into an auth redirect.
    if (error) return response;
    user = data.user;
  } catch {
    return response;
  }
  const isProtected = matchesPath(pathname, protectedPaths);
  const isAuthRoute = authPaths.includes(pathname);

  if (!user) {
    if (isProtected) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    return response;
  }

  let profile: { onboarding_completed: boolean } | null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    if (error) return response;
    profile = data;
  } catch {
    return response;
  }
  const onboardingCompleted = profile?.onboarding_completed === true;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(onboardingCompleted ? "/home" : "/onboarding", request.url));
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL(onboardingCompleted ? "/home" : "/onboarding", request.url));
  }

  if (matchesPath(pathname, onboardingGatedPaths) && !onboardingCompleted) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (pathname === "/onboarding" && onboardingCompleted) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/auth/:path*", "/home/:path*", "/profile/:path*", "/onboarding/:path*", "/projects/:path*", "/my-crew/:path*", "/my-projects/:path*", "/applications/:path*", "/discussion/:path*", "/github/:path*", "/u/:path*"],
};
