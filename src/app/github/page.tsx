import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { GitHubSettingsPanel } from "@/components/github/GitHubSettingsPanel";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";

type PageProps = { searchParams: Promise<{ github?: string | string[] }> };

export const dynamic = "force-dynamic";

export default async function GitHubPage({ searchParams }: PageProps) {
  const auth = requireResolvedAuthState(await getAuthState());
  if (auth.status === "onboarding-incomplete") redirect("/onboarding");
  const [profile, query] = await Promise.all([getCurrentUserProfile(auth.user.id), searchParams]);
  const githubStatus = typeof query.github === "string" ? query.github : undefined;

  return <AppShell profile={profile} active="github">
    <div className="workspace-page mx-auto max-w-5xl">
      <header className="workspace-page-heading">
        <div>
          <p className="workspace-eyebrow">Connected services</p>
          <h1>Your <span>GitHub.</span></h1>
          <p className="workspace-lede">Connect your account once. Project owners can then choose a repository in each discussion.</p>
        </div>
      </header>
      <GitHubSettingsPanel githubStatus={githubStatus} />
    </div>
  </AppShell>;
}
