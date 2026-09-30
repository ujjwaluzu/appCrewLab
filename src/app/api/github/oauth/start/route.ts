import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getGitHubAppConfig } from "@/lib/github";
import { getGitHubProjectContext, getGitHubUserContext } from "@/lib/github-project";
import { getTrustedSiteOrigin } from "@/lib/site";

const stateCookie = "crewlab_github_oauth_state";
const verifierCookie = "crewlab_github_oauth_verifier";
const projectCookie = "crewlab_github_oauth_project";
const userCookie = "crewlab_github_oauth_user";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getTrustedSiteOrigin(request);
  const projectId = requestUrl.searchParams.get("projectId") ?? "";
  if (!origin) return NextResponse.json({ error: "GitHub connection is not configured for this site." }, { status: 500 });

  const target = projectId ? `/discussion/${encodeURIComponent(projectId)}` : "/github";
  let userId: string;
  if (projectId) {
    const context = await getGitHubProjectContext(projectId);
    if (!context.ok) return NextResponse.redirect(new URL(`${target}?github=error`, origin));
    if (context.project.owner_id !== context.auth.user.id) return NextResponse.redirect(new URL(`${target}?github=owner-required`, origin));
    userId = context.auth.user.id;
  } else {
    const context = await getGitHubUserContext();
    if (!context.ok) return NextResponse.redirect(new URL(`${target}?github=error`, origin));
    userId = context.auth.user.id;
  }

  const { clientId } = getGitHubAppConfig();
  if (!clientId) return NextResponse.redirect(new URL(`${target}?github=not-configured`, origin));

  const state = randomBytes(32).toString("hex");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const callback = new URL("/api/github/oauth/callback", origin).toString();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", callback);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const cookieStore = await cookies();
  const cookieOptions = { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax" as const, path: "/", maxAge: 600 };
  cookieStore.set(stateCookie, state, cookieOptions);
  cookieStore.set(verifierCookie, verifier, cookieOptions);
  cookieStore.set(userCookie, userId, cookieOptions);
  if (projectId) cookieStore.set(projectCookie, projectId, cookieOptions);
  else cookieStore.delete(projectCookie);
  return NextResponse.redirect(authorizeUrl);
}
