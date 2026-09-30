import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getGitHubAccessToken, getGitHubAppConfig } from "@/lib/github";
import { getGitHubProjectContext, getGitHubUserContext } from "@/lib/github-project";
import { getTrustedSiteOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

const stateCookie = "crewlab_github_install_state";
const projectCookie = "crewlab_github_install_project";
const userCookie = "crewlab_github_install_user";

export async function GET(request: Request) {
  const origin = getTrustedSiteOrigin(request);
  const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
  if (!origin) return NextResponse.json({ error: "GitHub connection is not configured for this site." }, { status: 500 });

  const target = projectId ? `/discussion/${encodeURIComponent(projectId)}` : "/github";
  let userId: string;
  let supabase: Awaited<ReturnType<typeof createClient>>;
  if (projectId) {
    const context = await getGitHubProjectContext(projectId);
    if (!context.ok) return NextResponse.redirect(new URL(`${target}?github=error`, origin));
    if (context.project.owner_id !== context.auth.user.id) return NextResponse.redirect(new URL(`${target}?github=owner-required`, origin));
    userId = context.auth.user.id;
    supabase = context.supabase;
  } else {
    const context = await getGitHubUserContext();
    if (!context.ok) return NextResponse.redirect(new URL(`${target}?github=error`, origin));
    userId = context.auth.user.id;
    supabase = context.supabase;
  }

  const { slug } = getGitHubAppConfig();
  const accessToken = await getGitHubAccessToken(supabase, userId);
  if (!slug || !accessToken) return NextResponse.redirect(new URL(`${target}?github=connect-first`, origin));

  const state = randomBytes(32).toString("hex");
  const installUrl = new URL(`https://github.com/apps/${encodeURIComponent(slug)}/installations/new`);
  installUrl.searchParams.set("state", state);
  const cookieOptions = { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax" as const, path: "/", maxAge: 600 };
  const cookieStore = await cookies();
  cookieStore.set(stateCookie, state, cookieOptions);
  cookieStore.set(userCookie, userId, cookieOptions);
  if (projectId) cookieStore.set(projectCookie, projectId, cookieOptions);
  else cookieStore.delete(projectCookie);
  return NextResponse.redirect(installUrl);
}
