import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { getAuthState } from "@/lib/auth";
import { getProfilesForProjects } from "@/lib/crew";
import { getCurrentUserProfile } from "@/lib/profile";
import { getMyCrewProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function MyCrewPage() {
  const auth = await getAuthState();
  if (!auth.user) redirect("/auth");
  if (!auth.onboardingCompleted) redirect("/onboarding");
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/onboarding");

  const result = await getMyCrewProjects(auth.user.id);
  const crewProfiles = result.error ? null : await getProfilesForProjects(result.projects);

  return <AppShell profile={profile} active="my-crew">
    <div className="workspace-page mx-auto max-w-6xl">
      <header className="workspace-page-heading animate-fade-in">
        <div><p className="workspace-eyebrow">Building together</p><h1>My <span>Crew.</span></h1><p className="workspace-lede">Projects you&apos;re building with others.</p></div>
        <Link href="/projects" className="secondary-button shrink-0">Explore projects</Link>
      </header>
      {result.error ? <div className="project-empty-state" role="alert"><h2>We couldn&apos;t load your crew.</h2><p>Please refresh to try again.</p></div> : result.projects.length ? <div className="project-grid mt-7">{result.projects.map((project) => <ProjectCard key={project.id} project={project} crewProfiles={crewProfiles?.profiles.get(project.id) ?? []} />)}</div> : <div className="project-empty-state"><span className="project-empty-mark" aria-hidden="true">+</span><h2>You&apos;re not part of any crews yet.</h2><p>Find a project and start building with others.</p><Link href="/projects" className="primary-button mt-5">Explore projects</Link></div>}
      {crewProfiles?.error ? <p className="mt-3 text-sm text-[#9e4639]" role="alert">Project cards loaded, but we couldn&apos;t load crew profiles.</p> : null}
    </div>
  </AppShell>;
}
