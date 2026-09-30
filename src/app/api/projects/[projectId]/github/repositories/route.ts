import { NextResponse } from "next/server";

import { createInstallationToken, getGitHubAccessToken, getInstallationRepositories, getUserGitHubAppInstallations, githubApi, type GitHubRepository } from "@/lib/github";
import { getGitHubProjectContext } from "@/lib/github-project";

type RouteContext = { params: Promise<{ projectId: string }> };
type InstallationRepositories = { repositories: GitHubRepository[] };

async function getProjectOwner(projectId: string) {
  const context = await getGitHubProjectContext(projectId);
  if (!context.ok) return { response: NextResponse.json({ error: context.error.message }, { status: context.error.status }) };
  if (context.project.owner_id !== context.auth.user.id) return { response: NextResponse.json({ error: "Only the project owner can connect a repository." }, { status: 403 }) };
  try {
    const accessToken = await getGitHubAccessToken(context.supabase, context.auth.user.id);
    if (!accessToken) return { response: NextResponse.json({ error: "Connect your GitHub account from the GitHub tab first." }, { status: 409 }) };
    const installations = await getUserGitHubAppInstallations(accessToken);
    if (!installations.length) return { response: NextResponse.json({ error: "Install the CrewLab App from the GitHub tab first." }, { status: 409 }) };
    return { context, installations };
  } catch {
    return { response: NextResponse.json({ error: "Could not check your GitHub installations." }, { status: 502 }) };
  }
}

export async function GET(_request: Request, route: RouteContext) {
  const { projectId } = await route.params;
  const owner = await getProjectOwner(projectId);
  if ("response" in owner) return owner.response;
  try {
    const repositoryResults = await Promise.allSettled(owner.installations.map(async (installation) => {
      const items = await getInstallationRepositories(String(installation.id));
      return items.map((repo) => ({
        id: String(repo.id),
        installation_id: String(installation.id),
        account_login: installation.account?.login ?? "GitHub account",
        full_name: repo.full_name,
        html_url: repo.html_url,
        private: repo.private,
        description: repo.description,
        default_branch: repo.default_branch,
      }));
    }));
    if (repositoryResults.every((result) => result.status === "rejected")) throw new Error("Could not read repositories from any installation.");
    const repositories = repositoryResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    repositories.sort((a, b) => a.full_name.localeCompare(b.full_name));
    return NextResponse.json({ repositories });
  } catch {
    return NextResponse.json({ error: "CrewLab could not load repositories available to your GitHub App installations." }, { status: 502 });
  }
}

export async function POST(request: Request, route: RouteContext) {
  const { projectId } = await route.params;
  const owner = await getProjectOwner(projectId);
  if ("response" in owner) return owner.response;
  let body: { repositoryId?: unknown; installationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a repository to connect." }, { status: 400 });
  }
  const repositoryId = typeof body.repositoryId === "string" ? body.repositoryId : "";
  const installationId = typeof body.installationId === "string" ? body.installationId : "";
  if (!/^\d+$/.test(repositoryId)) return NextResponse.json({ error: "Choose a valid repository." }, { status: 400 });
  if (!/^\d+$/.test(installationId) || !owner.installations.some((installation) => String(installation.id) === installationId)) {
    return NextResponse.json({ error: "Choose a repository available to one of your CrewLab installations." }, { status: 400 });
  }

  try {
    const token = await createInstallationToken(installationId, repositoryId);
    const result = await githubApi<InstallationRepositories>("/installation/repositories?per_page=100", token);
    const repository = result.repositories.find((repo) => String(repo.id) === repositoryId);
    if (!repository) return NextResponse.json({ error: "That repository is not available to this GitHub App installation." }, { status: 404 });

    const installation = owner.installations.find((item) => String(item.id) === installationId);
    if (!installation?.account?.login) return NextResponse.json({ error: "Could not verify the GitHub account for that installation." }, { status: 409 });

    const { error: installationError } = await owner.context.supabase.from("project_github_installations").upsert({
      project_id: projectId,
      installation_id: installationId,
      account_login: installation.account.login,
      connected_by: owner.context.auth.user.id,
    });
    if (installationError) return NextResponse.json({ error: "Could not save the GitHub installation for this project." }, { status: 503 });

    const { error } = await owner.context.supabase.from("project_github_repositories").upsert({
      project_id: projectId,
      installation_id: installationId,
      repository_id: String(repository.id),
      full_name: repository.full_name,
      html_url: repository.html_url,
      is_private: repository.private,
      default_branch: repository.default_branch,
      connected_by: owner.context.auth.user.id,
      updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: "Could not save the selected repository." }, { status: 503 });
    return NextResponse.json({ connected: true });
  } catch {
    return NextResponse.json({ error: "CrewLab could not verify that repository." }, { status: 502 });
  }
}

export async function DELETE(_request: Request, route: RouteContext) {
  const { projectId } = await route.params;
  const context = await getGitHubProjectContext(projectId);
  if (!context.ok) return NextResponse.json({ error: context.error.message }, { status: context.error.status });
  if (context.project.owner_id !== context.auth.user.id) return NextResponse.json({ error: "Only the project owner can disconnect the repository." }, { status: 403 });
  const { error } = await context.supabase.from("project_github_repositories").delete().eq("project_id", projectId);
  if (error) return NextResponse.json({ error: "Could not disconnect the repository." }, { status: 503 });
  return NextResponse.json({ connected: false });
}
