import { NextResponse } from "next/server";

import { deleteGitHubConnection, getGitHubAccessToken, getGitHubAppConfig, revokeGitHubUserAuthorization } from "@/lib/github";
import { getGitHubUserContext } from "@/lib/github-project";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE() {
  const context = await getGitHubUserContext();
  if (!context.ok) return NextResponse.json({ error: context.error.message }, { status: context.error.status });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "GitHub server storage is not configured." }, { status: 503 });
  }
  let accessToken: string | null = null;
  try {
    accessToken = await getGitHubAccessToken(admin, context.auth.user.id);
  } catch {
    // Still remove the local connection if its token cannot be read or refreshed.
  }

  let removed: boolean;
  try {
    removed = await deleteGitHubConnection(admin, context.auth.user.id);
  } catch {
    return NextResponse.json({ error: "Could not disconnect your GitHub account. Please try again." }, { status: 503 });
  }
  if (!removed) return NextResponse.json({ connected: false, githubRevoked: false });

  // The local row is CrewLab's source of truth and is already gone, so a GitHub
  // outage must not fail the request. The caller is told which half succeeded so
  // it can tell the user their authorization may need revoking at GitHub.
  const { clientId, clientSecret } = getGitHubAppConfig();
  if (!clientId || !clientSecret || !accessToken) return NextResponse.json({ connected: false, githubRevoked: false });

  let githubRevoked = false;
  try {
    githubRevoked = await revokeGitHubUserAuthorization(clientId, clientSecret, accessToken);
  } catch {
    githubRevoked = false;
  }
  return NextResponse.json({ connected: false, githubRevoked });
}
