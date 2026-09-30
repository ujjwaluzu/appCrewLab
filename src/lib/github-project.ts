import { getAuthState } from "@/lib/auth";
import type { AuthState } from "@/lib/auth";
import { getDiscussionProjects, type Project } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

type GitHubProjectContext =
  | { ok: false; error: { status: number; message: string } }
  | { ok: true; auth: Extract<AuthState, { status: "authenticated" }>; project: Project; supabase: Awaited<ReturnType<typeof createClient>> };

export type GitHubUserContext =
  | { ok: false; error: { status: number; message: string } }
  | { ok: true; auth: Extract<AuthState, { status: "authenticated" }>; supabase: Awaited<ReturnType<typeof createClient>> };

export async function getGitHubUserContext(): Promise<GitHubUserContext> {
  const auth = await getAuthState();
  if (auth.status === "unauthenticated") return { ok: false, error: { status: 401, message: "Sign in to continue." } } satisfies GitHubUserContext;
  if (auth.status === "auth-error" || auth.status === "profile-error") return { ok: false, error: { status: 503, message: "CrewLab could not verify your session. Please retry." } } satisfies GitHubUserContext;
  if (auth.status === "onboarding-incomplete") return { ok: false, error: { status: 403, message: "Complete onboarding before connecting GitHub." } } satisfies GitHubUserContext;
  return { ok: true, auth, supabase: await createClient() };
}

export async function getGitHubProjectContext(projectId: string): Promise<GitHubProjectContext> {
  const userContext = await getGitHubUserContext();
  if (!userContext.ok) return userContext;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
    return { ok: false, error: { status: 404, message: "Project not found." } } satisfies GitHubProjectContext;
  }

  const result = await getDiscussionProjects(userContext.auth.user.id);
  if (result.error) return { ok: false, error: { status: 503, message: "Could not check project access. Please retry." } } satisfies GitHubProjectContext;
  const project = result.projects.find((item) => item.id === projectId);
  if (!project) return { ok: false, error: { status: 404, message: "Project not found." } } satisfies GitHubProjectContext;

  return { ...userContext, project: project as Project } satisfies GitHubProjectContext;
}
