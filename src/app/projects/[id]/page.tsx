import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { CrewSection } from "@/components/crew/CrewSection";
import { JoinProjectControl, OwnerJoinRequests } from "@/components/crew/CrewControls";
import { getProjectCrewData } from "@/lib/crew";
import { getAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
import { getProjectById } from "@/lib/projects";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { project } = await getProjectById(id);
  if (!project) return { title: "Project — CrewLab" };
  return {
    title: `${project.title} — CrewLab`,
    description: project.short_description || `Explore ${project.title} on CrewLab.`,
  };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const auth = await getAuthState();
  if (!auth.user) redirect("/auth");
  if (!auth.onboardingCompleted) redirect("/onboarding");
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/onboarding");
  const { id } = await params;
  const result = await getProjectById(id);
  if (!result.project && !result.error) notFound();

  if (result.error) {
    return <AppShell profile={profile} active="projects"><div className="project-empty-state"><h1>We couldn&apos;t load this project.</h1><p>Please check your connection and try again.</p><Link href={`/projects/${id}`} className="secondary-button mt-5">Try again</Link></div></AppShell>;
  }

  const project = result.project!;
  const isOwner = project.owner_id === auth.user.id;
  const crew = await getProjectCrewData(project, auth.user.id);
  const ownerName = project.owner?.display_name || project.owner?.username || "CrewLab builder";

  return (
    <AppShell profile={profile} active="projects">
      <article className="workspace-page mx-auto max-w-4xl">
        <Link href="/projects" className="project-back-link">← All projects</Link>
        <header className="project-detail-header mt-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3"><ProjectStatusBadge status={project.status} />{isOwner ? <span className="project-owner-label">Your project</span> : null}</div>
            <h1 className="mt-5 break-words text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{project.title}</h1>
            {project.short_description ? <p className="mt-4 max-w-2xl text-lg leading-8 text-[#59665d]">{project.short_description}</p> : null}
          </div>
          {isOwner ? <Link className="secondary-button shrink-0" href={`/projects/${project.id}/edit`}>Edit project</Link> : null}
        </header>

        <div className="project-detail-grid mt-10">
          <div className="min-w-0 space-y-8">
            <section className="project-detail-section">
              <p className="workspace-eyebrow">About this project</p>
              {project.description ? <p className="mt-4 whitespace-pre-wrap text-[0.98rem] leading-8 text-[#48564d]">{project.description}</p> : <p className="mt-4 text-sm leading-7 text-[#83877f]">The project details are still taking shape.</p>}
            </section>
            <section className="project-detail-section">
              <p className="workspace-eyebrow">Skills needed</p>
              {project.skills.length ? <div className="mt-4 flex flex-wrap gap-2">{project.skills.map((skill) => <span key={skill.id} className="project-skill-chip">{skill.name}</span>)}</div> : <p className="mt-4 text-sm text-[#83877f]">No skills added yet.</p>}
            </section>
            {crew.error ? <section className="project-detail-section"><h2 className="font-semibold text-[#26362c]">Crew</h2><p className="mt-3 text-sm text-[#9e4639]" role="alert">We couldn&apos;t load the crew. Please refresh to try again.</p></section> : <>
              <CrewSection members={crew.members} isOwner={isOwner} projectId={project.id} />
              <section className="project-detail-section" aria-labelledby="join-project-heading">
                <p className="workspace-eyebrow">Find your people</p>
                <h2 id="join-project-heading" className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#26362c]">Join this project</h2>
                <div className="mt-4">{isOwner ? <p className="text-sm leading-6 text-[#69766e]">You own this project and are already part of its crew.</p> : <JoinProjectControl projectId={project.id} userId={auth.user.id} requestId={crew.requestId} initialStatus={crew.requestStatus} isOwner={isOwner} crewCount={crew.members.length} />}</div>
              </section>
              {isOwner ? <section id="join-requests" className="project-detail-section rounded-2xl border border-[#17251f]/10 bg-[#f8f5ee] p-5 sm:p-6" aria-labelledby="join-requests-heading">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="workspace-eyebrow">Project owner</p><h2 id="join-requests-heading" className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#26362c]">Join requests</h2></div><span className="crew-request-count">{crew.pendingRequests.length} pending</span></div>
                <div className="mt-5"><OwnerJoinRequests requests={crew.pendingRequests} /></div>
              </section> : null}
            </>}
          </div>

          <aside className="project-owner-card">
            <p className="workspace-eyebrow">Created by</p>
            <div className="mt-4 flex items-center gap-3">
              {project.owner?.username ? <Link href={`/u/${encodeURIComponent(project.owner.username)}`} aria-label={`View ${ownerName}'s profile`}><Avatar name={ownerName} username={project.owner.username} size="lg" /></Link> : <Avatar name={ownerName} size="lg" />}
              <div className="min-w-0"><p className="truncate font-semibold text-[#26362c]">{project.owner?.username ? <Link href={`/u/${encodeURIComponent(project.owner.username)}`} className="crew-profile-link">{ownerName}</Link> : ownerName}</p>{project.owner?.username ? <p className="mt-1 truncate text-sm text-[#7a7466]"><Link href={`/u/${encodeURIComponent(project.owner.username)}`} className="crew-profile-link">@{project.owner.username}</Link></p> : null}</div>
            </div>
            <div className="mt-5 border-t border-[#17251f]/10 pt-4 text-xs text-[#83877f]">Started {new Date(project.created_at).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</div>
          </aside>
        </div>
      </article>
    </AppShell>
  );
}
