import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createGitHubAppJwt, GitHubApiError, getGitHubAccessToken, getGitHubAppConfig, githubApi } from "@/lib/github";
import { getGitHubProjectContext, getGitHubUserContext } from "@/lib/github-project";
import { getTrustedSiteOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

const stateCookie = "crewlab_github_install_state";
const projectCookie = "crewlab_github_install_project";
const userCookie = "crewlab_github_install_user";

type UserInstallations = { installations: Array<{ id: number; app_id: number; account?: { login?: string } }> };
type AppInstallation = {
  id: number;
  app_id: number;
  account?: { login?: string };
  permissions?: { contents?: string; issues?: string; pull_requests?: string };
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getTrustedSiteOrigin(request);
  if (!origin) return NextResponse.json({ error: "GitHub connection is not configured for this site." }, { status: 500 });
  const cookieStore = await cookies();
  const projectId = cookieStore.get(projectCookie)?.value ?? "";
  const expectedUserId = cookieStore.get(userCookie)?.value ?? "";
  const target = projectId ? `/discussion/${encodeURIComponent(projectId)}` : "/github";
  const expectedState = cookieStore.get(stateCookie)?.value ?? "";
  const state = requestUrl.searchParams.get("state") ?? "";
  const installationId = requestUrl.searchParams.get("installation_id") ?? "";
  const cleanup = (response: NextResponse) => {
    response.cookies.delete(stateCookie);
    response.cookies.delete(projectCookie);
    response.cookies.delete(userCookie);
    return response;
  };
  const fail = (reason: string) => cleanup(NextResponse.redirect(new URL(`${target}?github=${reason}`, origin)));

  if (!state || state !== expectedState || !expectedUserId || !/^\d+$/.test(installationId)) return fail("install-state-invalid");

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let userId: string;
  if (projectId) {
    const context = await getGitHubProjectContext(projectId);
    if (!context.ok || context.project.owner_id !== context.auth.user.id || context.auth.user.id !== expectedUserId) return fail("owner-check-failed");
    supabase = context.supabase;
    userId = context.auth.user.id;
  } else {
    const context = await getGitHubUserContext();
    if (!context.ok || context.auth.user.id !== expectedUserId) return fail("install-state-invalid");
    supabase = context.supabase;
    userId = context.auth.user.id;
  }

  const { appId } = getGitHubAppConfig();
  if (!appId) return fail("app-config-missing");

  let userAccessToken: string | null;
  try {
    userAccessToken = await getGitHubAccessToken(supabase, userId);
  } catch {
    return fail("github-account-check-failed");
  }
  if (!userAccessToken) return fail("connect-first");

  let userInstallations: UserInstallations;
  try {
    userInstallations = await githubApi<UserInstallations>("/user/installations?per_page=100", userAccessToken);
  } catch (error) {
    const reason = error instanceof GitHubApiError && error.status === 401
      ? "github-account-expired"
      : "github-account-verification-failed";
    return fail(reason);
  }
  if (!userInstallations.installations.some((item) => String(item.id) === installationId && String(item.app_id) === appId)) {
    return fail("installation-account-mismatch");
  }

  let installation: AppInstallation;
  let appJwt: string;
  try {
    appJwt = createGitHubAppJwt();
  } catch {
    return fail("app-private-key-invalid");
  }

  try {
    installation = await githubApi<AppInstallation>(`/app/installations/${installationId}`, appJwt);
  } catch {
    return fail("app-credentials-invalid");
  }
  if (String(installation.app_id) !== appId) return fail("wrong-github-app");
  if (!installation.account?.login) return fail("installation-account-missing");

  const hasReadPermissions = installation.permissions?.contents === "read"
    && installation.permissions?.issues === "read"
    && installation.permissions?.pull_requests === "read";
  if (!hasReadPermissions) return fail("app-permissions-insufficient");

  if (projectId) {
    try {
      const { error } = await supabase.from("project_github_installations").upsert({
        project_id: projectId,
        installation_id: installationId,
        account_login: installation.account.login,
        connected_by: userId,
      });
      if (error) return fail("installation-save-failed");
    } catch {
      return fail("installation-save-failed");
    }
  }
  return cleanup(NextResponse.redirect(new URL(`${target}?github=installed`, origin)));
}
