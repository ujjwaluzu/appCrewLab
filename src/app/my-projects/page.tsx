import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
import { getProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ page?: string }> };

export default async function MyProjectsPage({ searchParams }: PageProps) {
  const auth = requireResolvedAuthState(await getAuthState());
  if (auth.status === "onboarding-incomplete") redirect("/onboarding");

  const params = await searchParams;
  const requestedPage = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const [profile, result] = await Promise.all([
    getCurrentUserProfile(auth.user.id),
    getProjects({ ownerId: auth.user.id, page, limit: 24 }),
  ]);
  const previousParams = new URLSearchParams({ page: String(Math.max(1, page - 1)) });
  const nextParams = new URLSearchParams({ page: String(page + 1) });

  return <AppShell profile={profile} active="my-projects">
    <div className="workspace-page mx-auto max-w-6xl">
      <header className="workspace-page-heading projects-page-heading animate-fade-in">
        <div>
          <p className="workspace-eyebrow">Your workspace</p>
          <h1>My <span>projects.</span></h1>
          <p className="workspace-lede">Manage the ideas you&apos;ve started and see how they&apos;re progressing.</p>
        </div>
        <Link href="/projects/new" className="primary-button shrink-0">Create a project <span aria-hidden="true">↗</span></Link>
      </header>

      {result.error ? <div className="project-empty-state" role="alert"><h2>We couldn&apos;t load your projects.</h2><p>Please try again in a moment.</p><Link href="/my-projects" className="secondary-button mt-5">Try again</Link></div> : result.projects.length ? <>
        <div className="project-grid">{result.projects.map((project) => <ProjectCard key={project.id} project={project} showUpdatedAt />)}</div>
        {page > 1 || result.hasMore ? <nav className="project-pagination" aria-label="My project pages">
          {page > 1 ? <Link href={`/my-projects?${previousParams.toString()}`} className="secondary-button">← Newer projects</Link> : <span />}
          <span>Page {page}</span>
          {result.hasMore ? <Link href={`/my-projects?${nextParams.toString()}`} className="secondary-button">Older projects →</Link> : <span />}
        </nav> : null}
      </> : page > 1 ? <div className="project-empty-state"><h2>No more projects on this page.</h2><Link href={`/my-projects?${previousParams.toString()}`} className="secondary-button mt-5">Back to previous page</Link></div> : <div className="project-empty-state"><span className="project-empty-mark" aria-hidden="true">+</span><h2>You haven&apos;t created a project yet.</h2><p>Your projects will appear here after you create one.</p><Link href="/projects/new" className="primary-button mt-5">Create your first project</Link></div>}
    </div>
  </AppShell>;
}