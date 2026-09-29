import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/config";

const protectedPaths = ["/home", "/profile", "/onboarding", "/projects", "/my-crew", "/u"];
const authPaths = ["/auth", "/auth/login", "/auth/signup"];

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

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const isProtected = matchesPath(pathname, protectedPaths);
  const isAuthRoute = authPaths.includes(pathname);

  if (!user) {
    if (isProtected) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  const onboardingCompleted = profile?.onboarding_completed === true;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(onboardingCompleted ? "/home" : "/onboarding", request.url));
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL(onboardingCompleted ? "/home" : "/onboarding", request.url));
  }

  if ((pathname === "/home" || pathname === "/profile" || pathname.startsWith("/projects") || pathname.startsWith("/my-crew") || pathname.startsWith("/u/")) && !onboardingCompleted) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (pathname === "/onboarding" && onboardingCompleted) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/auth/:path*", "/home/:path*", "/profile/:path*", "/onboarding/:path*", "/projects/:path*", "/my-crew/:path*", "/u/:path*"],
};
