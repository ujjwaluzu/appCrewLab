import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { encryptGitHubToken, expiryFromSeconds, getGitHubAppConfig, githubApi, saveGitHubConnection } from "@/lib/github";
import { getGitHubProjectContext, getGitHubUserContext } from "@/lib/github-project";
import { getTrustedSiteOrigin } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

const stateCookie = "crewlab_github_oauth_state";
const verifierCookie = "crewlab_github_oauth_verifier";
const projectCookie = "crewlab_github_oauth_project";
const userCookie = "crewlab_github_oauth_user";

type GitHubUser = { id: number; login: string };

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getTrustedSiteOrigin(request);
  if (!origin) return NextResponse.json({ error: "GitHub connection is not configured for this site." }, { status: 500 });

  const cookieStore = await cookies();
  const projectId = cookieStore.get(projectCookie)?.value ?? "";
  const expectedUserId = cookieStore.get(userCookie)?.value ?? "";
  const target = projectId ? `/discussion/${encodeURIComponent(projectId)}` : "/github";
  const state = requestUrl.searchParams.get("state") ?? "";
  const expectedState = cookieStore.get(stateCookie)?.value ?? "";
  const verifier = cookieStore.get(verifierCookie)?.value ?? "";
  const code = requestUrl.searchParams.get("code") ?? "";
  const cleanup = (response: NextResponse) => {
    response.cookies.delete(stateCookie);
    response.cookies.delete(verifierCookie);
    response.cookies.delete(projectCookie);
    response.cookies.delete(userCookie);
    return response;
  };
  const fail = (reason: string) => cleanup(NextResponse.redirect(new URL(`${target}?github=${reason}`, origin)));

  if (!state || !expectedState || state !== expectedState || !verifier || !code || !expectedUserId) {
    return fail("connection-failed");
  }

  let userId: string;
  if (projectId) {
    const context = await getGitHubProjectContext(projectId);
    if (!context.ok || context.project.owner_id !== context.auth.user.id || context.auth.user.id !== expectedUserId) {
      return fail("connection-failed");
    }
    userId = context.auth.user.id;
  } else {
    const context = await getGitHubUserContext();
    if (!context.ok || context.auth.user.id !== expectedUserId) return fail("connection-failed");
    userId = context.auth.user.id;
  }

  const { clientId, clientSecret } = getGitHubAppConfig();
  if (!clientId || !clientSecret) return fail("not-configured");

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: new URL("/api/github/oauth/callback", origin).toString(),
        code_verifier: verifier,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new Error("Token exchange failed.");
    const tokenData = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number; error?: string };
    if (!tokenData.access_token || tokenData.error) throw new Error("GitHub authorization failed.");

    const githubUser = await githubApi<GitHubUser>("/user", tokenData.access_token);
    // The upsert keeps the stored refresh token when GitHub omits a new one, so a
    // reconnect that returns only an access token cannot strand a valid six-month
    // refresh token.
    await saveGitHubConnection(createAdminClient(), userId, {
      githubUserId: String(githubUser.id),
      githubLogin: githubUser.login,
      accessTokenEncrypted: encryptGitHubToken(tokenData.access_token),
      refreshTokenEncrypted: tokenData.refresh_token ? encryptGitHubToken(tokenData.refresh_token) : null,
      accessTokenExpiresAt: expiryFromSeconds(tokenData.expires_in),
      refreshTokenExpiresAt: expiryFromSeconds(tokenData.refresh_token_expires_in),
    });

    return cleanup(NextResponse.redirect(new URL(`${target}?github=connected`, origin)));
  } catch {
    return fail("connection-failed");
  }
}
