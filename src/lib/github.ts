import { createCipheriv, createDecipheriv, createSign, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

const apiVersion = "2026-03-10";

/** Non-sensitive columns selected through the caller-scoped client. */
export type GitHubUserConnection = {
  user_id: string;
  github_user_id: string;
  github_login: string;
  created_at: string;
  updated_at: string;
};

/** Ciphertexts plus the optimistic-lock version used to detect a concurrent rotation. */
export type GitHubConnectionTokens = {
  user_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  access_token_expires_at: string | null;
  refresh_token_expires_at: string | null;
  token_version: number;
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
  return Boolean(config.appId && config.slug && config.clientId && config.clientSecret && config.privateKey && process.env.GITHUB_TOKEN_ENCRYPTION_KEY && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
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
    .select("user_id, github_user_id, github_login, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load GitHub connection.");
  return data as GitHubUserConnection | null;
}

async function readGitHubConnectionTokens(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("github_user_connection_tokens", { target_user_id: userId });
  if (error) throw new Error("Could not load GitHub connection.");
  const row = (Array.isArray(data) ? data[0] : data) as GitHubConnectionTokens | null | undefined;
  if (!row) return null;
  // The function already constrains the row to auth.uid(); re-check so a future
  // change to it can never widen this read to another account's tokens.
  if (row.user_id !== userId) throw new Error("Could not load GitHub connection.");
  return row;
}

/**
 * A token is usable when it is unexpired with a minute of headroom, or when GitHub
 * reported no expiry at all because token expiration is disabled on the App.
 * Throws if the stored ciphertext cannot be decrypted.
 */
function usableAccessToken(connection: GitHubConnectionTokens): string | null {
  if (!connection.access_token_encrypted) return null;
  if (!connection.access_token_expires_at || Date.parse(connection.access_token_expires_at) > Date.now() + 60_000) {
    return decryptGitHubToken(connection.access_token_encrypted);
  }
  return null;
}

/**
 * GitHub refresh tokens are single use: once one is exchanged, both it and the old
 * access token stop working. Without coordination two requests that notice the same
 * expiry both exchange the same refresh token, the loser gets 400 invalid_grant, and
 * the caller reports "reauthorize" for a connection that another request just
 * refreshed successfully. One in-flight exchange per user keeps this process honest;
 * token_version covers the other instances of a serverless deployment, where a loser
 * re-reads the winner's row instead of failing.
 */
const inFlightRefreshes = new Map<string, Promise<string | null>>();

function singleFlightRefresh(key: string, exchange: () => Promise<string | null>): Promise<string | null> {
  const existing = inFlightRefreshes.get(key);
  if (existing) return existing;
  const started = exchange().finally(() => { inFlightRefreshes.delete(key); });
  inFlightRefreshes.set(key, started);
  return started;
}

type RefreshedToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
};

async function requestTokenExchange(body: Record<string, unknown>) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const tokenData = await response.json() as Partial<RefreshedToken> & { error?: string };
  if (!tokenData.access_token || tokenData.error) return null;
  return tokenData as RefreshedToken;
}

/** GitHub reports lifetimes in seconds; a missing value means token expiration is disabled on the App. */
export function expiryFromSeconds(seconds: number | undefined) {
  return seconds ? new Date(Date.now() + seconds * 1000).toISOString() : null;
}

/** Re-reads after losing the optimistic-lock race so the winner's token is used. */
async function reReadUsableToken(supabase: SupabaseClient, userId: string, versionBeforeRace: number) {
  try {
    const current = await readGitHubConnectionTokens(supabase, userId);
    if (!current || current.token_version === versionBeforeRace) return null;
    return usableAccessToken(current);
  } catch {
    return null;
  }
}

async function rotateGitHubAccessToken(supabase: SupabaseClient, userId: string, connection: GitHubConnectionTokens) {
  const { clientId, clientSecret } = getGitHubAppConfig();
  if (!clientId || !clientSecret || !connection.refresh_token_encrypted) return null;

  const refreshed = await requestTokenExchange({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: decryptGitHubToken(connection.refresh_token_encrypted),
  });

  // A rejected exchange is ambiguous: the refresh token may simply have been
  // consumed by another instance moments earlier. Only report a failure if the
  // stored row is genuinely unchanged.
  if (!refreshed) return reReadUsableToken(supabase, userId, connection.token_version);

  const { data, error } = await supabase.rpc("github_apply_refreshed_token", {
    target_user_id: userId,
    expected_token_version: connection.token_version,
    new_access_token_encrypted: encryptGitHubToken(refreshed.access_token),
    new_refresh_token_encrypted: refreshed.refresh_token ? encryptGitHubToken(refreshed.refresh_token) : null,
    new_access_token_expires_at: expiryFromSeconds(refreshed.expires_in),
    new_refresh_token_expires_at: expiryFromSeconds(refreshed.refresh_token_expires_in),
  });
  if (error) throw new Error("Could not refresh GitHub connection.");
  if (data === true) return refreshed.access_token;

  return reReadUsableToken(supabase, userId, connection.token_version);
}

export async function getGitHubAccessToken(supabase: SupabaseClient, userId: string) {
  const connection = await readGitHubConnectionTokens(supabase, userId);
  if (!connection) return null;

  const ready = usableAccessToken(connection);
  if (ready) return ready;

  const refreshable = connection.refresh_token_encrypted
    && connection.refresh_token_expires_at
    && Date.parse(connection.refresh_token_expires_at) > Date.now();
  if (!refreshable) return null;

  return singleFlightRefresh(`github-token-refresh:${userId}`, () => rotateGitHubAccessToken(supabase, userId, connection));
}

/** Stores a completed OAuth exchange, preserving any still-valid refresh token. */
export async function saveGitHubConnection(supabase: SupabaseClient, userId: string, connection: {
  githubUserId: string;
  githubLogin: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
}) {
  const { error } = await supabase.rpc("github_upsert_user_connection", {
    target_user_id: userId,
    github_user_id: connection.githubUserId,
    github_login: connection.githubLogin,
    access_token_encrypted: connection.accessTokenEncrypted,
    refresh_token_encrypted: connection.refreshTokenEncrypted,
    access_token_expires_at: connection.accessTokenExpiresAt,
    refresh_token_expires_at: connection.refreshTokenExpiresAt,
  });
  if (error) throw new Error("Connection could not be saved.");
}

/** Removes the caller's connection row. Returns false when there was nothing to remove. */
export async function deleteGitHubConnection(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("github_delete_user_connection", { target_user_id: userId });
  if (error) throw new Error("Could not disconnect your GitHub account.");
  return data === true;
}

/**
 * Revokes every token the user granted this GitHub App, including refresh tokens.
 * Uses client id and secret as HTTP Basic credentials rather than a bearer token,
 * which is the only authentication this endpoint accepts.
 */
export async function revokeGitHubUserAuthorization(clientId: string, clientSecret: string, accessToken: string) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  const response = await fetch(`https://api.github.com/applications/${encodeURIComponent(clientId)}/token`, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": apiVersion,
    },
    body: JSON.stringify({ access_token: accessToken }),
    cache: "no-store",
  });
  return response.ok;
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
  for (let page = 1; ; page += 1) {
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
