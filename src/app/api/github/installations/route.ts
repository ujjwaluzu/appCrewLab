import { NextResponse } from "next/server";

import { getGitHubAccessToken, getGitHubAppConfig, getUserGitHubAppInstallations, isGitHubAppConfigured } from "@/lib/github";
import { getGitHubUserContext } from "@/lib/github-project";

export async function GET() {
  const context = await getGitHubUserContext();
  if (!context.ok) return NextResponse.json({ error: context.error.message }, { status: context.error.status });
  if (!isGitHubAppConfigured()) return NextResponse.json({ configured: false, connected: false, installations: [] });

  const { data: connection, error } = await context.supabase
    .from("github_user_connections")
    .select("github_login")
    .eq("user_id", context.auth.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load your GitHub account." }, { status: 503 });
  if (!connection) return NextResponse.json({ configured: true, connected: false, installations: [] });

  try {
    const accessToken = await getGitHubAccessToken(context.supabase, context.auth.user.id);
    if (!accessToken) return NextResponse.json({ configured: true, connected: true, githubLogin: connection.github_login, reauthorize: true, installations: [] });
    const installations = await getUserGitHubAppInstallations(accessToken);
    return NextResponse.json({
      configured: true,
      connected: true,
      githubLogin: connection.github_login,
      installations: installations.map((installation) => ({
        id: String(installation.id),
        accountLogin: installation.account?.login ?? "GitHub account",
        accountType: installation.target_type ?? "Account",
        repositorySelection: installation.repository_selection ?? "selected",
      })),
    });
  } catch {
    return NextResponse.json({ error: "Could not check your CrewLab GitHub installation. Reconnect your account and try again." }, { status: 502 });
  }
}
