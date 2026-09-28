import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectFilters } from "@/components/projects/ProjectFilters";
import { getAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
import { getProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ q?: string; skill?: string; page?: string }> };

export default async function ProjectsPage({ searchParams }: PageProps) {
  const auth = await getAuthState();
  if (!auth.user) redirect("/auth");
  if (!auth.onboardingCompleted) redirect("/onboarding");
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/onboarding");

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const skillSlug = typeof params.skill === "string" ? params.skill : "";
  const requestedPage = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const result = await getProjects({ query, skillSlug, page });
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (skillSlug) paginationParams.set("skill", skillSlug);
  const previousParams = new URLSearchParams(paginationParams);
  previousParams.set("page", String(page - 1));
  const nextParams = new URLSearchParams(paginationParams);
  nextParams.set("page", String(page + 1));

  return (
    <AppShell profile={profile} active="projects">
      <div className="workspace-page mx-auto max-w-6xl">
        <header className="workspace-page-heading animate-fade-in">
          <div>
            <p className="workspace-eyebrow">Made on CrewLab</p>
            <h1>Projects <span>worth building.</span></h1>
            <p className="workspace-lede">Explore ideas from builders across CrewLab.</p>
          </div>
          <Link href="/projects/new" className="primary-button shrink-0">Create a project <span aria-hidden="true">↗</span></Link>
        </header>

        <ProjectFilters query={query} skillSlug={skillSlug} />

        {result.error ? (
          <div className="project-empty-state" role="alert">
            <h2>We couldn&apos;t load projects.</h2>
            <p>Please try again in a moment.</p>
            <Link href="/projects" className="secondary-button mt-5">Try again</Link>
          </div>
        ) : result.projects.length ? (
          <div className="project-grid">
            {result.projects.map((project) => <ProjectCard key={project.id} project={project} />)}
          </div>
        ) : query || skillSlug ? (
          <div className="project-empty-state">
            <h2>No projects found.</h2>
            <p>Try a different search or skill.</p>
            <Link href="/projects" className="secondary-button mt-5">Clear filters</Link>
          </div>
        ) : page > 1 ? (
          <div className="project-empty-state">
            <h2>You’re all caught up.</h2>
            <p>There are no more projects on this page.</p>
            <Link href={`/projects?${previousParams.toString()}`} className="secondary-button mt-5">← Newer projects</Link>
          </div>
        ) : (
          <div className="project-empty-state">
            <span className="project-empty-mark" aria-hidden="true">+</span>
            <h2>No projects yet.</h2>
            <p>Be the first to bring an idea to CrewLab.</p>
            <Link href="/projects/new" className="primary-button mt-5">Create a project</Link>
          </div>
        )}
        {!result.error && result.projects.length ? (
          <nav className="project-pagination" aria-label="Project pages">
            {page > 1 ? <Link href={`/projects?${previousParams.toString()}`} className="secondary-button">← Newer projects</Link> : <span />}
            <span>Page {page}</span>
            {result.hasMore ? <Link href={`/projects?${nextParams.toString()}`} className="secondary-button">Older projects →</Link> : <span />}
          </nav>
        ) : null}
      </div>
    </AppShell>
  );
}
