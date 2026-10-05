"use client";

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";

type RepositoryChoice = { id: string; installation_id: string; account_login: string; full_name: string; html_url: string; private: boolean; description: string | null; default_branch: string };
type RepositoryView = {
  id: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  private: boolean;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  updatedAt: string;
};
type CommitView = { sha: string; shortSha: string; message: string; author: string; date: string; htmlUrl: string };
type BranchView = { name: string; protected: boolean; sha: string };
type PullRequestView = { number: number; title: string; author: string; createdAt: string; draft: boolean; head: string; base: string; htmlUrl: string };
type IssueView = { number: number; title: string; author: string; createdAt: string; comments: number; labels: Array<{ name: string; color: string }>; htmlUrl: string };
type WorkspaceData = {
  state: "setup-required" | "connect-account" | "install-app" | "choose-repository" | "not-linked" | "relink-required" | "connected";
  githubLogin?: string | null;
  relinkRequired?: boolean;
  repository?: RepositoryView;
  commits?: CommitView[];
  branches?: BranchView[];
  pullRequests?: PullRequestView[];
  issues?: IssueView[];
};

type Tab = "Overview" | "Commits" | "Branches" | "Pull requests" | "Issues";

const tabs: Tab[] = ["Overview", "Commits", "Branches", "Pull requests", "Issues"];

function formatDate(value: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function GitHubMark() {
  return <svg className="discussion-github-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.8A5.3 5.3 0 0 0 18.9 5a4.9 4.9 0 0 0-.1-3.8S17.6.9 15 2.8a13.4 13.4 0 0 0-7 0C5.4.9 4.2 1.2 4.2 1.2A4.9 4.9 0 0 0 4.1 5a5.3 5.3 0 0 0-1.4 3.7c0 5.3 3.2 6.5 6.2 6.8A3.4 3.4 0 0 0 8 18.1V22" /></svg>;
}

function RepositoryEmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="discussion-github-empty"><strong>{title}</strong><span>{detail}</span></div>;
}

function messageFromResponse(result: unknown) {
  return result && typeof result === "object" && "error" in result && typeof result.error === "string"
    ? result.error
    : "CrewLab couldn't complete this request. Please try again.";
}

export function GitHubRepositoryPanel({ projectId, isOwner, githubStatus }: { projectId: string; isOwner: boolean; githubStatus?: string }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [repositories, setRepositories] = useState<RepositoryChoice[]>([]);
  const [selectedRepository, setSelectedRepository] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [loadingRepositories, setLoadingRepositories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadRepositories = useCallback(async () => {
    setLoadingRepositories(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/github/repositories`, { cache: "no-store" });
      const result = await response.json() as { repositories?: RepositoryChoice[]; error?: string };
      if (!response.ok) throw new Error(messageFromResponse(result));
      setRepositories(result.repositories ?? []);
      setSelectedRepository(result.repositories?.[0]?.id ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "CrewLab couldn't load installed repositories.");
    } finally {
      setLoadingRepositories(false);
    }
  }, [projectId]);

  const loadWorkspace = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/github`, { cache: "no-store" });
      const result = await response.json() as WorkspaceData & { error?: string };
      if (!response.ok) throw new Error(messageFromResponse(result));
      setData(result);
      if (result.state === "choose-repository") await loadRepositories();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "CrewLab couldn't load the GitHub workspace.");
    } finally {
      setLoading(false);
    }
  }, [loadRepositories, projectId]);

  useEffect(() => { void Promise.resolve().then(() => loadWorkspace()); }, [loadWorkspace]);

  function retryWorkspace() {
    setLoading(true);
    setError("");
    void loadWorkspace();
  }

  async function connectRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRepository || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/github/repositories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: selectedRepository, installationId: repositories.find((repository) => repository.id === selectedRepository)?.installation_id }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(messageFromResponse(result));
      setRepositories([]);
      setLoading(true);
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "CrewLab couldn't connect that repository.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnectRepository() {
    if (!window.confirm("Disconnect this repository from the project?")) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/github/repositories`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(messageFromResponse(result));
      setLoading(true);
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "CrewLab couldn't disconnect the repository.");
    } finally {
      setSaving(false);
    }
  }

  const repository = data?.repository;
  const callbackMessages: Record<string, string> = {
    connected: "GitHub account connected. Install the CrewLab App next to grant access to a repository.",
    installed: "CrewLab was installed. Select the repository below to link it to this project.",
    "install-failed": "CrewLab couldn't finish verifying the installation. Check the App permissions and local Supabase migration, then try again.",
    "install-state-invalid": "The GitHub setup link expired or could not be verified. Start the installation again from this page.",
    "owner-check-failed": "CrewLab could not confirm that you own this project. Return to the project as its owner and retry.",
    "app-config-missing": "The GitHub App ID is missing from this server's configuration.",
    "github-account-check-failed": "CrewLab could not load your saved GitHub connection. Reconnect your GitHub account, then retry.",
    "connect-first": "Connect your GitHub account from the GitHub tab before installing the App.",
    "github-account-expired": "Your saved GitHub authorization has expired. Reconnect your GitHub account, then retry.",
    "github-account-verification-failed": "GitHub could not verify the account authorized in CrewLab. Reconnect the same GitHub account that installed the App.",
    "installation-account-mismatch": "The GitHub installation belongs to a different account than the one authorized in CrewLab. Connect that same account and retry.",
    "app-private-key-invalid": "GITHUB_APP_PRIVATE_KEY is not a valid GitHub App PEM private key. Download the private key from GitHub App settings, put its full contents in the server environment, and restart CrewLab.",
    "app-credentials-invalid": "CrewLab could not verify its GitHub App credentials. Check the App ID and private key configured on the server.",
    "wrong-github-app": "The installation belongs to a different GitHub App. Check that GITHUB_APP_ID and GITHUB_APP_SLUG refer to the same App.",
    "installation-account-missing": "GitHub did not return the account for this installation. Retry the installation.",
    "app-permissions-insufficient": "The installed App needs read-only Contents, Issues, and Pull requests repository permissions. Update the App permissions, approve them, then reinstall it.",
    "installation-save-failed": "GitHub verified the installation, but CrewLab could not save it. Check that migration 20260929000300_github_repositories.sql is applied to this local Supabase database and retry.",
    "not-configured": "GitHub setup is incomplete on this server. Check the GitHub App environment variables.",
    "connection-failed": "GitHub account connection did not complete. Please try again.",
    "owner-required": "Only the project owner can connect a GitHub repository.",
    error: "CrewLab could not start GitHub setup. Please try again.",
  };
  const callbackMessage = githubStatus ? callbackMessages[githubStatus] : undefined;

  return <section className="discussion-repository-panel discussion-github-panel" aria-labelledby="discussion-repository-title">
    {callbackMessage ? <p className={`discussion-github-callback-message ${githubStatus === "installed" || githubStatus === "connected" ? "is-success" : "is-error"}`} role="status">{callbackMessage}</p> : null}
    {loading ? <div className="discussion-github-loading" role="status" aria-labelledby="discussion-repository-title"><h2 id="discussion-repository-title" className="sr-only">GitHub repository workspace</h2><span /><span /><span />Loading project repository…</div> : error && !data ? <div className="discussion-github-state" role="alert"><span className="discussion-repository-icon"><GitHubMark /></span><p className="workspace-eyebrow">Project workspace</p><h2 id="discussion-repository-title">GitHub workspace unavailable</h2><p>{error}</p><button type="button" className="secondary-button" onClick={retryWorkspace}>Try again</button></div> : data?.state === "setup-required" ? <div className="discussion-github-state"><span className="discussion-repository-icon"><GitHubMark /></span><p className="workspace-eyebrow">Project workspace</p><h2 id="discussion-repository-title">Connect your GitHub repo</h2><p>GitHub App setup is needed before this project can connect a repository.</p></div> : data?.state === "not-linked" ? <div className="discussion-github-state"><span className="discussion-repository-icon"><GitHubMark /></span><p className="workspace-eyebrow">Project workspace</p><h2 id="discussion-repository-title">No repository connected yet</h2><p>The project owner can connect a GitHub repository here.</p></div> : data?.state === "relink-required" ? <div className="discussion-github-state"><span className="discussion-repository-icon"><GitHubMark /></span><p className="workspace-eyebrow">Project workspace</p><h2 id="discussion-repository-title">Repository needs to be reconnected</h2><p>The project owner must select the repository again to verify its access.</p></div> : data?.state === "connect-account" ? <div className="discussion-github-state"><span className="discussion-repository-icon"><GitHubMark /></span><p className="workspace-eyebrow">Project workspace</p><h2 id="discussion-repository-title">Connect your GitHub repo</h2><p>Connect your GitHub account from workspace settings. You only need to do this once.</p><a className="primary-button" href="/github">Open GitHub settings</a></div> : data?.state === "install-app" ? <div className="discussion-github-state"><span className="discussion-repository-icon"><GitHubMark /></span><p className="workspace-eyebrow">Connected as @{data.githubLogin}</p><h2 id="discussion-repository-title">Install CrewLab once</h2><p>{data.relinkRequired ? "Reconnect the CrewLab App, then reselect the repository to verify access." : "Install CrewLab from the GitHub tab, then choose this project's repository here."}</p><a className="primary-button" href="/github">Open GitHub settings</a></div> : data?.state === "choose-repository" ? <div className="discussion-github-state discussion-repository-picker"><span className="discussion-repository-icon"><GitHubMark /></span><p className="workspace-eyebrow">Project workspace</p><h2 id="discussion-repository-title">Choose this project&apos;s repository</h2><p>{data.relinkRequired ? "Select this repository again to verify access before sharing it with the project crew." : "The linked repository will be visible to project members."}</p>
      {error ? <p className="discussion-github-inline-error" role="alert">{error}</p> : null}
      {loadingRepositories ? <p className="discussion-github-repositories-loading" role="status">Loading repositories available to this installation…</p> : repositories.length ? <form onSubmit={connectRepository}><label htmlFor="github-repository-choice">Repository</label><select id="github-repository-choice" className="form-input" value={selectedRepository} onChange={(event) => setSelectedRepository(event.target.value)}><option value="">Select a repository</option>{repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.full_name}{repo.private ? " · Private" : " · Public"}</option>)}</select><button type="submit" className="primary-button" disabled={!selectedRepository || saving}>{saving ? "Connecting…" : "Connect repository"}</button></form> : <><p className="discussion-github-repositories-empty">No repositories are available to this CrewLab installation. Add repository access from your GitHub tab, then reload.</p><a className="secondary-button" href="/github">Manage GitHub access</a><button type="button" className="secondary-button" onClick={() => void loadRepositories()} disabled={loadingRepositories}>Reload repositories</button></>}
      </div> : repository ? <div className="discussion-github-connected">
        <header className="discussion-github-repo-header">
          <div className="discussion-github-repo-identity">
            <span className="discussion-github-brand-icon"><GitHubMark /></span>
            <div className="discussion-github-repo-copy">
              <div className="discussion-github-repo-title-row">
                <h2 id="discussion-repository-title"><span>{repository.fullName.split("/")[0]}</span><span className="discussion-github-repo-slash"> / </span><strong>{repository.fullName.split("/").slice(1).join("/") || repository.fullName}</strong></h2>
                <span className={`discussion-github-visibility ${repository.private ? "is-private" : "is-public"}`}>{repository.private ? "Private" : "Public"}</span>
              </div>
              <p>{repository.description || "No repository description."}</p>
            </div>
          </div>
          <div className="discussion-github-repo-actions"><a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="discussion-github-open-button">Open on GitHub <span aria-hidden="true">↗</span></a>{isOwner ? <button type="button" className="discussion-github-disconnect" onClick={() => void disconnectRepository()} disabled={saving}>{saving ? "Disconnecting…" : "Disconnect"}</button> : null}</div>
        </header>
        <dl className="discussion-github-stats" aria-label="Repository statistics"><div><dt>Language</dt><dd>{repository.language || "N/A"}</dd></div><div><dt>Stars</dt><dd>{repository.stars.toLocaleString()}</dd></div><div><dt>Forks</dt><dd>{repository.forks.toLocaleString()}</dd></div><div><dt>Open issues</dt><dd>{repository.openIssues.toLocaleString()}</dd></div><div><dt>Default branch</dt><dd><code>{repository.defaultBranch}</code></dd></div></dl>
        <nav className="discussion-github-tabs" role="tablist" aria-label="Repository sections">{tabs.map((tab, index) => {
          const id = `github-tab-${index}`;
          const count = tab === "Commits" ? data.commits?.length : tab === "Branches" ? data.branches?.length : tab === "Pull requests" ? data.pullRequests?.length : tab === "Issues" ? data.issues?.length : undefined;
          return <button type="button" role="tab" id={id} aria-controls="github-tab-panel" aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1} key={tab} className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)} onKeyDown={(event) => {
            const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
            if (nextIndex < 0) return;
            event.preventDefault();
            setActiveTab(tabs[nextIndex]);
            document.getElementById(`github-tab-${nextIndex}`)?.focus();
          }}>{tab}{count !== undefined ? <span>{count}</span> : null}</button>;
        })}</nav>
        {error ? <p className="discussion-github-inline-error" role="alert">{error}</p> : null}
        <div className="discussion-github-content" id="github-tab-panel" role="tabpanel" aria-labelledby={`github-tab-${tabs.indexOf(activeTab)}`} tabIndex={0} aria-live="polite">
          {activeTab === "Overview" ? <div className="discussion-github-overview">
            <section className="discussion-github-overview-section">
              <header className="discussion-github-section-heading"><div><h3>Recent commits</h3><span>{data.commits?.length ?? 0} recent</span></div><button type="button" onClick={() => setActiveTab("Commits")}>View all</button></header>
              {data.commits?.length ? <div className="discussion-github-list">{data.commits.slice(0, 5).map((commit) => <a className="discussion-github-list-item" href={commit.htmlUrl} target="_blank" rel="noreferrer" key={commit.sha}><span className="discussion-github-item-main"><strong>{commit.message || "Untitled commit"}</strong><small>{commit.author} <span aria-hidden="true">·</span> {formatDate(commit.date)}</small></span><code>{commit.shortSha}</code></a>)}</div> : <RepositoryEmptyState title="No recent commits" detail="New commits will appear here." />}
            </section>
            <section className="discussion-github-overview-section">
              <header className="discussion-github-section-heading"><div><h3>Open pull requests</h3><span>{data.pullRequests?.length ?? 0} open</span></div><button type="button" onClick={() => setActiveTab("Pull requests")}>View all</button></header>
              {data.pullRequests?.length ? <div className="discussion-github-list">{data.pullRequests.slice(0, 5).map((pull) => <a className="discussion-github-list-item discussion-github-pull-item" href={pull.htmlUrl} target="_blank" rel="noreferrer" key={pull.number}><span className="discussion-github-item-main"><strong><span className="discussion-github-pull-number">#{pull.number}</span> {pull.title}</strong><small>{pull.author} <span aria-hidden="true">·</span> {pull.head} <span aria-hidden="true">→</span> {pull.base} <span aria-hidden="true">·</span> {formatDate(pull.createdAt)}</small></span><span className={`discussion-github-status ${pull.draft ? "is-draft" : "is-open"}`}>{pull.draft ? "Draft" : "Open"}</span></a>)}</div> : <RepositoryEmptyState title="No open pull requests" detail="Open pull requests will appear here." />}
            </section>
          </div> : null}
          {activeTab === "Commits" ? <section className="discussion-github-tab-section"><header className="discussion-github-section-heading"><div><h3>Commits</h3><span>{data.commits?.length ?? 0} total</span></div></header>{data.commits?.length ? <div className="discussion-github-list">{data.commits.map((commit) => <a className="discussion-github-list-item" href={commit.htmlUrl} target="_blank" rel="noreferrer" key={commit.sha}><span className="discussion-github-item-main"><strong>{commit.message || "Untitled commit"}</strong><small>{commit.author} <span aria-hidden="true">·</span> {formatDate(commit.date)}</small></span><code>{commit.shortSha}</code></a>)}</div> : <RepositoryEmptyState title="No commits found" detail="Repository commits will appear here." />}</section> : null}
          {activeTab === "Branches" ? <section className="discussion-github-tab-section"><header className="discussion-github-section-heading"><div><h3>Branches</h3><span>{data.branches?.length ?? 0} total</span></div></header>{data.branches?.length ? <div className="discussion-github-list">{data.branches.map((branch) => <div className="discussion-github-list-item" key={branch.name}><span className="discussion-github-item-main"><strong>{branch.name}</strong><small>{branch.protected ? "Protected branch" : "Branch"}</small></span><code>{branch.sha}</code></div>)}</div> : <RepositoryEmptyState title="No branches found" detail="Repository branches will appear here." />}</section> : null}
          {activeTab === "Pull requests" ? <section className="discussion-github-tab-section"><header className="discussion-github-section-heading"><div><h3>Open pull requests</h3><span>{data.pullRequests?.length ?? 0} open</span></div></header>{data.pullRequests?.length ? <div className="discussion-github-list">{data.pullRequests.map((pull) => <a className="discussion-github-list-item discussion-github-pull-item" href={pull.htmlUrl} target="_blank" rel="noreferrer" key={pull.number}><span className="discussion-github-item-main"><strong><span className="discussion-github-pull-number">#{pull.number}</span> {pull.title}</strong><small>{pull.author} <span aria-hidden="true">·</span> {pull.head} <span aria-hidden="true">→</span> {pull.base} <span aria-hidden="true">·</span> {formatDate(pull.createdAt)}</small></span><span className={`discussion-github-status ${pull.draft ? "is-draft" : "is-open"}`}>{pull.draft ? "Draft" : "Open"}</span></a>)}</div> : <RepositoryEmptyState title="No open pull requests" detail="Open pull requests will appear here." />}</section> : null}
          {activeTab === "Issues" ? <section className="discussion-github-tab-section"><header className="discussion-github-section-heading"><div><h3>Open issues</h3><span>{data.issues?.length ?? 0} open</span></div></header>{data.issues?.length ? <div className="discussion-github-list">{data.issues.map((issue) => <a className="discussion-github-list-item" href={issue.htmlUrl} target="_blank" rel="noreferrer" key={issue.number}><span className="discussion-github-item-main"><strong><span className="discussion-github-pull-number">#{issue.number}</span> {issue.title}</strong><small>{issue.author} <span aria-hidden="true">·</span> {issue.comments} comments</small><span className="discussion-github-labels">{issue.labels.map((label) => <span key={`${issue.number}-${label.name}`} style={{ "--label-color": `#${label.color}` } as CSSProperties}>{label.name}</span>)}</span></span><time>{formatDate(issue.createdAt)}</time></a>)}</div> : <RepositoryEmptyState title="No open issues" detail="Open issues will appear here." />}</section> : null}
        </div>
      </div> : <div className="discussion-github-state"><h2>Repository unavailable</h2><button type="button" className="secondary-button" onClick={() => void loadWorkspace()}>Try again</button></div>}
  </section>;
}
