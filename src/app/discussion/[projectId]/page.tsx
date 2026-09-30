import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { GitHubRepositoryPanel } from "@/components/discussion/GitHubRepositoryPanel";
import { DiscussionThread } from "@/components/discussion/DiscussionThread";
import { DiscussionWorkspace } from "@/components/discussion/DiscussionWorkspace";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getProjectDiscussionPosts } from "@/lib/discussion";
import { getCurrentUserProfile } from "@/lib/profile";
import { getDiscussionProject } from "@/lib/projects";

type PageProps = { params: Promise<{ projectId: string }>; searchParams: Promise<{ github?: string | string[] }> };

export const dynamic = "force-dynamic";

export default async function ProjectDiscussionPage({ params, searchParams }: PageProps) {
  const auth = requireResolvedAuthState(await getAuthState());
  if (auth.status === "onboarding-incomplete") redirect("/onboarding");
  const [{ projectId }, query] = await Promise.all([params, searchParams]);

  const [profile, projectResult] = await Promise.all([
    getCurrentUserProfile(auth.user.id),
    getDiscussionProject(projectId, auth.user.id),
  ]);
  if (projectResult.error) {
    return <AppShell profile={profile} active="discussion"><div className="project-empty-state" role="alert"><h1>We couldn&apos;t open this discussion.</h1><p>Please check your connection and try again.</p><Link href={`/discussion/${projectId}`} className="secondary-button mt-5">Try again</Link></div></AppShell>;
  }

  const project = projectResult.project;
  if (!project) notFound();

  const discussion = await getProjectDiscussionPosts(project.id);

  return <AppShell profile={profile} active="discussion">
    <div className="workspace-page discussion-room-page mx-auto w-full">
      <Link href="/discussion" className="discussion-back-link"><span aria-hidden="true">←</span> All discussions</Link>
      <DiscussionWorkspace
        heading={<div>
          <p className="workspace-eyebrow">Project discussion</p>
          <h1>{project.title}</h1>
          <p>{project.short_description || "A shared space for the project crew."}</p>
        </div>}
        phase={<ProjectStatusBadge status={project.status} />}
        meta={<div className="discussion-room-meta"><span>{project.crew_count} {project.crew_count === 1 ? "member" : "members"}</span>{project.skills.length ? <div>{project.skills.map((skill) => <span className="project-skill-chip" key={skill.id}>{skill.name}</span>)}</div> : null}</div>}
        chat={discussion.error
          ? <div className="project-empty-state discussion-load-error" role="alert"><h2>We couldn&apos;t load this discussion.</h2><p>Your message and project access are safe. Please try again.</p><Link href={`/discussion/${project.id}`} className="secondary-button mt-5">Try again</Link></div>
          : <DiscussionThread projectId={project.id} currentUserId={auth.user.id} currentUser={{ id: profile.id, display_name: profile.display_name, username: profile.username, skills: [] }} posts={discussion.posts} />}
      >
        <GitHubRepositoryPanel projectId={project.id} isOwner={project.owner_id === auth.user.id} githubStatus={typeof query.github === "string" ? query.github : undefined} />
      </DiscussionWorkspace>
    </div>
  </AppShell>;
}
