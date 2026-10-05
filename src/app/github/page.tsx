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
      <section className="github-guide" aria-labelledby="github-guide-title">
        <header className="github-guide-heading">
          <p className="workspace-eyebrow">Help</p>
          <h2 id="github-guide-title">Connect, install, and manage GitHub</h2>
          <p>GitHub account connection and the CrewLab App installation are separate steps. You need both to use repositories in CrewLab.</p>
        </header>

        <ol className="github-guide-steps">
          <li className="github-guide-card">
            <h3>1. Connect your GitHub account</h3>
            <p>Select <strong>Connect GitHub</strong> above and approve CrewLab on GitHub. This lets CrewLab identify your GitHub account and its installations. You only need to connect once per CrewLab account.</p>
          </li>
          <li className="github-guide-card">
            <h3>2. Install the CrewLab App</h3>
            <p>Select <strong>Install CrewLab App</strong> above. On GitHub, choose your personal account or an organization, then choose all repositories or only the repositories CrewLab may access. An organization may require an organization owner to approve the installation.</p>
            <p>CrewLab requests read access to repository contents, issues, and pull requests. You can change the repository selection later using <strong>Manage repository access on GitHub</strong>.</p>
          </li>
          <li className="github-guide-card">
            <h3>3. Choose a repository for a project</h3>
            <p>Open the project discussion and use its GitHub repository control to select a repository available to that project. A project owner manages this link. The selected repository and its GitHub activity are then available to that project crew.</p>
          </li>
        </ol>

        <div className="github-guide-management">
          <section className="github-guide-card">
            <h3>Disconnect your GitHub account</h3>
            <p>Select <strong>Disconnect GitHub account</strong> above to remove CrewLab's saved account authorization. CrewLab will also ask GitHub to revoke that authorization. This does not uninstall the CrewLab App or unlink repositories from projects.</p>
            <p>If the page says GitHub did not confirm revocation, sign in as the GitHub user who connected the account and revoke CrewLab under <a href="https://github.com/settings/apps/authorizations" target="_blank" rel="noreferrer">Authorized GitHub Apps</a>.</p>
          </section>
          <section className="github-guide-card">
            <h3>Uninstall CrewLab from an account or organization</h3>
            <p>To remove the App's repository access, open GitHub's <a href="https://github.com/settings/installations" target="_blank" rel="noreferrer">Installed GitHub Apps</a>, find CrewLab, select <strong>Configure</strong>, then select <strong>Uninstall</strong>. For an organization installation, an organization owner can open the organization's <strong>Settings &gt; Third-party Access &gt; GitHub Apps</strong>, configure CrewLab, and uninstall it there.</p>
            <p>Uninstalling removes CrewLab's access for that account or organization. If CrewLab is installed in more than one place, repeat these steps for each installation. To fully remove GitHub access, also disconnect your account above or revoke CrewLab under Authorized GitHub Apps.</p>
          </section>
        </div>
      </section>
    </div>
  </AppShell>;
}
