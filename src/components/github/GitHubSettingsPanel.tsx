"use client";

import { useCallback, useEffect, useState } from "react";

type Installation = { id: string; accountLogin: string; accountType: string; repositorySelection: "all" | "selected" };
type GitHubSettings = {
  configured: boolean;
  connected: boolean;
  githubLogin?: string;
  reauthorize?: boolean;
  installations: Installation[];
};

const callbackMessages: Record<string, { message: string; error?: boolean }> = {
  connected: { message: "Your GitHub account is connected." },
  installed: { message: "CrewLab is installed. Choose repositories for each project from its discussion page." },
  "connect-first": { message: "Connect your GitHub account before installing CrewLab.", error: true },
  "owner-check-failed": { message: "CrewLab could not verify your workspace account. Return to the GitHub tab and try again.", error: true },
  "not-configured": { message: "GitHub setup is incomplete on this server. Check the App settings.", error: true },
  error: { message: "CrewLab could not start GitHub setup. Please try again.", error: true },
  "connection-failed": { message: "GitHub account connection did not complete. Please try again.", error: true },
  "github-account-check-failed": { message: "CrewLab could not load your saved GitHub account. Reconnect your account and retry.", error: true },
  "app-config-missing": { message: "The GitHub App ID is missing from this server configuration.", error: true },
  "app-private-key-invalid": { message: "The GitHub App private key is invalid. Check the server environment and restart CrewLab.", error: true },
  "app-credentials-invalid": { message: "GitHub could not verify the App credentials. Check the App ID and private key.", error: true },
  "wrong-github-app": { message: "The installation belongs to a different GitHub App. Check the configured App ID and slug.", error: true },
  "app-permissions-insufficient": { message: "CrewLab needs read-only Contents, Issues, and Pull requests permissions. Update the App permissions and retry.", error: true },
  "github-account-expired": { message: "Your saved GitHub authorization expired. Reconnect your account and retry.", error: true },
  "github-account-verification-failed": { message: "GitHub could not verify your connected account. Reconnect and retry.", error: true },
  "installation-account-mismatch": { message: "The installation is not available to the GitHub account connected to CrewLab.", error: true },
  "installation-account-missing": { message: "GitHub did not return an account for this installation. Retry the installation.", error: true },
  "installation-save-failed": { message: "GitHub verified the installation, but CrewLab could not save it. Check that the GitHub migrations are applied.", error: true },
  "install-state-invalid": { message: "The GitHub setup link expired or could not be verified. Start again from this page.", error: true },
  disconnected: { message: "Your GitHub account is disconnected." },
};

export function GitHubSettingsPanel({ githubStatus }: { githubStatus?: string }) {
  const [settings, setSettings] = useState<GitHubSettings | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/github/installations", { cache: "no-store" });
      const result = await response.json() as GitHubSettings & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load GitHub settings.");
      setSettings(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load GitHub settings.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const disconnect = useCallback(async () => {
    setError("");
    setNotice("");
    setDisconnecting(true);
    try {
      const response = await fetch("/api/github/connection", { method: "DELETE" });
      const result = await response.json() as { error?: string; githubRevoked?: boolean };
      if (!response.ok) throw new Error(result.error || "Could not disconnect your GitHub account.");
      setNotice(result.githubRevoked
        ? "Your GitHub account is disconnected and CrewLab's authorization was revoked at GitHub."
        : "Your GitHub account is disconnected. CrewLab removed its saved token, but GitHub did not confirm the revocation, so revoke the CrewLab app from your GitHub settings.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not disconnect your GitHub account.");
    } finally {
      setDisconnecting(false);
    }
  }, [load]);

  const callback = githubStatus ? callbackMessages[githubStatus] : undefined;
  const installations = settings?.installations ?? [];

  return <div className="github-settings-stack">
    {callback ? <p className={`github-settings-notice ${callback.error ? "is-error" : "is-success"}`} role="status">{callback.message}</p> : null}
    {error ? <p className="github-settings-notice is-error" role="alert">{error}</p> : null}
    {notice ? <p className="github-settings-notice is-success" role="status">{notice}</p> : null}
    {!settings ? <section className="github-settings-card" aria-busy="true"><p className="workspace-eyebrow">GitHub account</p><h2>Checking your connection…</h2></section> : null}
    {settings && !settings.configured ? <section className="github-settings-card" role="alert"><p className="workspace-eyebrow">GitHub App</p><h2>GitHub is not configured yet.</h2><p>Ask the site administrator to finish the server-side GitHub App setup.</p></section> : null}
    {settings?.configured && !settings.connected ? <section className="github-settings-card"><p className="workspace-eyebrow">Step 1</p><h2>Connect your GitHub account</h2><p>Authorize CrewLab once to find your App installations and repositories. Your token stays encrypted on the server.</p><a className="primary-button" href="/api/github/oauth/start">Connect GitHub</a></section> : null}
    {settings?.configured && settings.connected ? <>
      <section className="github-settings-card">
        <div className="github-settings-card-heading"><div><p className="workspace-eyebrow">GitHub account</p><h2>Connected as @{settings.githubLogin}</h2></div><span className="github-settings-pill is-connected">Connected</span></div>
        {settings.reauthorize ? <p className="github-settings-inline-error" role="alert">Your GitHub authorization needs to be refreshed. Connect your account again to continue.</p> : <p>Your account connection is shared across your projects. Connect CrewLab once, then choose a repository from each project discussion.</p>}
        {settings.reauthorize ? <a className="primary-button" href="/api/github/oauth/start">Reconnect GitHub</a> : null}
        <div className="github-settings-actions">
          <button className="secondary-button" type="button" onClick={() => void disconnect()} disabled={disconnecting}>{disconnecting ? "Disconnecting…" : "Disconnect GitHub account"}</button>
        </div>
      </section>
      <section className="github-settings-card">
        <div className="github-settings-card-heading"><div><p className="workspace-eyebrow">CrewLab access</p><h2>{installations.length ? "CrewLab is installed" : "Install CrewLab once"}</h2></div><span className={`github-settings-pill ${installations.length ? "is-connected" : ""}`}>{installations.length ? `${installations.length} ${installations.length === 1 ? "account" : "accounts"}` : "Not installed"}</span></div>
        {installations.length ? <><p>These GitHub accounts have granted CrewLab read-only repository access. Choose an available repository in any project discussion.</p><ul className="github-installation-list">{installations.map((installation) => <li key={installation.id}><span><strong>{installation.accountLogin}</strong><small>{installation.accountType} account · {installation.repositorySelection === "all" ? "all repositories" : "selected repositories"}</small></span></li>)}</ul><a className="secondary-button" href="/api/github/install/start">Manage repository access on GitHub</a></> : <><p>Install the CrewLab App on a GitHub account or organization. You can add or remove repository access later from GitHub.</p><a className="primary-button" href="/api/github/install/start">Install CrewLab App</a></>}
      </section>
    </> : null}
    {settings?.configured ? <p className="github-settings-footnote">CrewLab only requests read access to repository contents, issues, and pull requests. Project owners choose which repository is shared with each project crew.</p> : null}
  </div>;
}
