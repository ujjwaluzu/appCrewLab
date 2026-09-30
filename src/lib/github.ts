import { createCipheriv, createDecipheriv, createSign, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

const apiVersion = "2026-03-10";

export type GitHubUserConnection = {
  user_id: string;
  github_user_id: string;
  github_login: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  access_token_expires_at: string | null;
  refresh_token_expires_at: string | null;
};

export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
};

export class GitHubApiError extends Error {
  constructor(public readonly status: number) {
    super("GitHub request failed.");
  }
}

export function getGitHubAppConfig() {
  return {
    appId: process.env.GITHUB_APP_ID ?? "",
    slug: process.env.GITHUB_APP_SLUG ?? "",
    clientId: process.env.GITHUB_APP_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET ?? "",
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "",
  };
}

export function isGitHubAppConfigured() {
  const config = getGitHubAppConfig();
  return Boolean(config.appId && config.slug && config.clientId && config.clientSecret && config.privateKey && process.env.GITHUB_TOKEN_ENCRYPTION_KEY);
}

export function encryptGitHubToken(token: string) {
  const encodedKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error("GitHub token encryption is not configured.");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("GitHub token encryption key must be 32 bytes.");

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptGitHubToken(value: string) {
  const encodedKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error("GitHub token encryption is not configured.");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("GitHub token encryption key must be 32 bytes.");
  const [ivPart, tagPart, encryptedPart] = value.split(".");
  if (!ivPart || !tagPart || !encryptedPart) throw new Error("Stored GitHub token is invalid.");

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]).toString("utf8");
}

export async function getGitHubConnection(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("github_user_connections")
    .select("user_id, github_user_id, github_login, access_token_encrypted, refresh_token_encrypted, access_token_expires_at, refresh_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load GitHub connection.");
  return data as GitHubUserConnection | null;
}

export async function getGitHubAccessToken(supabase: SupabaseClient, userId: string) {
  const connection = await getGitHubConnection(supabase, userId);
  if (!connection) return null;
  if (!connection.access_token_expires_at || Date.parse(connection.access_token_expires_at) > Date.now() + 60_000) {
    return decryptGitHubToken(connection.access_token_encrypted);
  }
  if (!connection.refresh_token_encrypted || !connection.refresh_token_expires_at || Date.parse(connection.refresh_token_expires_at) <= Date.now()) return null;

  const { clientId, clientSecret } = getGitHubAppConfig();
  const refreshResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: decryptGitHubToken(connection.refresh_token_encrypted),
    }),
    cache: "no-store",
  });
  if (!refreshResponse.ok) return null;
  const refreshed = await refreshResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number };
  if (!refreshed.access_token) return null;

  const now = Date.now();
  const { error } = await supabase.from("github_user_connections").update({
    access_token_encrypted: encryptGitHubToken(refreshed.access_token),
    refresh_token_encrypted: refreshed.refresh_token ? encryptGitHubToken(refreshed.refresh_token) : connection.refresh_token_encrypted,
    access_token_expires_at: refreshed.expires_in ? new Date(now + refreshed.expires_in * 1000).toISOString() : null,
    refresh_token_expires_at: refreshed.refresh_token_expires_in ? new Date(now + refreshed.refresh_token_expires_in * 1000).toISOString() : connection.refresh_token_expires_at,
    updated_at: new Date(now).toISOString(),
  }).eq("user_id", userId);
  if (error) throw new Error("Could not refresh GitHub connection.");
  return refreshed.access_token;
}

export function createGitHubAppJwt() {
  const { appId, privateKey } = getGitHubAppConfig();
  if (!appId || !privateKey) throw new Error("GitHub App credentials are not configured.");
  const base64url = (value: string) => Buffer.from(value).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 8 * 60, iss: appId }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(privateKey).toString("base64url")}`;
}

export async function githubApi<T>(path: string, token: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": apiVersion,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  if (!response.ok) throw new GitHubApiError(response.status);
  return response.json() as Promise<T>;
}

export type GitHubAppInstallation = {
  id: number;
  app_id: number;
  account?: { login?: string; type?: string };
  target_type?: string;
  repository_selection?: "all" | "selected";
};

export async function getUserGitHubAppInstallations(userAccessToken: string) {
  const { appId } = getGitHubAppConfig();
  const installations: GitHubAppInstallation[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await githubApi<{ installations: GitHubAppInstallation[] }>(
      `/user/installations?per_page=100&page=${page}`,
      userAccessToken,
    );
    const batch = result.installations ?? [];
    installations.push(...batch.filter((installation) => String(installation.app_id) === appId));
    if (batch.length < 100) break;
  }
  return installations;
}

export async function getInstallationRepositories(installationId: string) {
  const token = await createInstallationToken(installationId);
  const repositories: GitHubRepository[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await githubApi<{ repositories: GitHubRepository[] }>(
      `/installation/repositories?per_page=100&page=${page}`,
      token,
    );
    const batch = result.repositories ?? [];
    repositories.push(...batch);
    if (batch.length < 100) break;
  }
  return repositories;
}

export async function githubAppApi<T>(path: string): Promise<T> {
  return githubApi<T>(path, createGitHubAppJwt());
}

export async function createInstallationToken(installationId: string, repositoryId?: string) {
  const body: { repository_ids?: number[]; permissions: Record<string, "read"> } = {
    permissions: { contents: "read", issues: "read", pull_requests: "read" },
  };
  if (repositoryId) body.repository_ids = [Number(repositoryId)];
  const result = await githubApi<{ token: string }>(
    `/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
    createGitHubAppJwt(),
    "POST",
    body,
  );
  return result.token;
}
