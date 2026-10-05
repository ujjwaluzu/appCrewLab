import { NextResponse } from "next/server";

import { createInstallationToken, getGitHubAccessToken, getUserGitHubAppInstallations, GitHubApiError, githubApi, isGitHubAppConfigured, type GitHubRepository } from "@/lib/github";
import { getGitHubProjectContext } from "@/lib/github-project";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ projectId: string }> };
type Commit = { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } | null }; author: { login: string; avatar_url: string } | null };
type Branch = { name: string; protected: boolean; commit: { sha: string } };
type PullRequest = { number: number; title: string; html_url: string; user: { login: string } | null; created_at: string; draft: boolean; head: { ref: string }; base: { ref: string } };
type Issue = { number: number; title: string; html_url: string; user: { login: string } | null; created_at: string; comments: number; labels: Array<{ name: string; color: string }> };

export async function GET(_request: Request, route: RouteContext) {
  const { projectId } = await route.params;
  const context = await getGitHubProjectContext(projectId);
  if (!context.ok) return NextResponse.json({ error: context.error.message }, { status: context.error.status });

  const { data: foundRepository, error: repositoryError } = await context.supabase
    .from("project_github_repositories")
    .select("installation_id, repository_id, full_name, html_url, is_private, default_branch, server_verified_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (repositoryError) return NextResponse.json({ error: "Could not load the linked repository." }, { status: 503 });
  let repository = foundRepository;
  let needsRelink = false;
  if (repository && !repository.server_verified_at) {
    if (context.project.owner_id !== context.auth.user.id) return NextResponse.json({ state: "relink-required" });
    needsRelink = true;
    repository = null;
  }
  if (!repository) {
    if (context.project.owner_id !== context.auth.user.id) return NextResponse.json({ state: "not-linked" });
    if (!isGitHubAppConfigured()) return NextResponse.json({ state: "setup-required" });
    const { data: userConnection, error: userError } = await context.supabase
      .from("github_user_connections")
      .select("github_login")
      .eq("user_id", context.auth.user.id)
      .maybeSingle();
    if (userError) return NextResponse.json({ error: "Could not load the GitHub account." }, { status: 503 });
    if (!userConnection) return NextResponse.json({ state: "connect-account" });
    try {
      const accessToken = await getGitHubAccessToken(createAdminClient(), context.auth.user.id);
      if (!accessToken) return NextResponse.json({ state: "connect-account", githubLogin: userConnection.github_login, reauthorize: true });
      const installations = await getUserGitHubAppInstallations(accessToken);
      return NextResponse.json({ state: installations.length ? "choose-repository" : "install-app", githubLogin: userConnection.github_login, relinkRequired: needsRelink });
    } catch {
      return NextResponse.json({ error: "Could not check the connected GitHub account. Reconnect and try again." }, { status: 502 });
    }
  }
  if (!isGitHubAppConfigured()) return NextResponse.json({ state: "setup-required" });

  try {
    const token = await createInstallationToken(repository.installation_id, repository.repository_id);
    const encodedName = repository.full_name.split("/").map(encodeURIComponent).join("/");
    const endpoint = `/repos/${encodedName}`;
    const [repoData, commits, branches, pulls, issues] = await Promise.all([
      githubApi<GitHubRepository>(endpoint, token),
      githubApi<Commit[]>(`${endpoint}/commits?per_page=10`, token),
      githubApi<Branch[]>(`${endpoint}/branches?per_page=30`, token),
      githubApi<PullRequest[]>(`${endpoint}/pulls?state=open&per_page=10`, token),
      githubApi<Issue[]>(`${endpoint}/issues?state=open&per_page=30`, token),
    ]);

    if (String(repoData.id) !== repository.repository_id) return NextResponse.json({ error: "The linked GitHub repository has changed." }, { status: 409 });
    return NextResponse.json({
      state: "connected",
      repository: {
        id: String(repoData.id),
        name: repoData.name,
        fullName: repoData.full_name,
        htmlUrl: repoData.html_url,
        private: repoData.private,
        description: repoData.description,
        language: repoData.language,
        defaultBranch: repoData.default_branch,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
        updatedAt: repoData.updated_at,
      },
      commits: commits.map((item) => ({
        sha: item.sha,
        shortSha: item.sha.slice(0, 7),
        message: item.commit.message.split("\n")[0],
        author: item.author?.login ?? item.commit.author?.name ?? "GitHub user",
        date: item.commit.author?.date ?? "",
        htmlUrl: item.html_url,
      })),
      branches: branches.map((item) => ({ name: item.name, protected: item.protected, sha: item.commit.sha.slice(0, 7) })),
      pullRequests: pulls.map((item) => ({ number: item.number, title: item.title, author: item.user?.login ?? "GitHub user", createdAt: item.created_at, draft: item.draft, head: item.head.ref, base: item.base.ref, htmlUrl: item.html_url })),
      issues: issues.filter((item) => !("pull_request" in item)).map((item) => ({ number: item.number, title: item.title, author: item.user?.login ?? "GitHub user", createdAt: item.created_at, comments: item.comments, labels: item.labels.map((label) => ({ name: label.name, color: label.color })), htmlUrl: item.html_url })),
    });
  } catch (error) {
    const status = error instanceof GitHubApiError ? error.status : 502;
    const message = status === 401 || status === 404
      ? "This GitHub installation can no longer access the linked repository. Ask the project owner to reconnect it."
      : status === 403
        ? "GitHub temporarily denied this request. Please try again shortly."
        : "CrewLab could not load repository details. Please try again.";
    return NextResponse.json({ error: message }, { status: status === 404 ? 409 : status === 401 ? 409 : status === 403 ? 503 : 502 });
  }
}
