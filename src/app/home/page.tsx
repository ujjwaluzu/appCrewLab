import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { getAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
import { getProfileCompletion } from "@/lib/profile-utils";
import { getMyCrewProjects, getProjects } from "@/lib/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const auth = await getAuthState();
  if (!auth.user) redirect("/auth");
  if (!auth.onboardingCompleted) redirect("/onboarding");

  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/onboarding");

  const name = profile.display_name || profile.username || "Builder";
  const firstName = name.split(" ")[0];
  const completion = getProfileCompletion(profile, profile.skills.length);
  const [ownedProjects, crewProjects] = await Promise.all([
    getProjects({ ownerId: auth.user.id, limit: 3 }),
    getMyCrewProjects(auth.user.id),
  ]);

  return (
    <AppShell profile={profile} active="home">
      <div className="workspace-page mx-auto max-w-6xl">
        <header className="workspace-page-heading animate-fade-in">
          <div>
            <p className="workspace-eyebrow">Your workspace</p>
            <h1>Welcome back, <span>{firstName}.</span></h1>
            <p className="workspace-lede">A little progress today can turn into something great tomorrow.</p>
          </div>
          <div className="workspace-heading-avatar"><Avatar name={profile.display_name} username={profile.username} size="md" /><span>Builder<br />at CrewLab</span></div>
        </header>

        <section className="home-profile-card">
          <div className="home-card-orbit" aria-hidden="true" />
          <div className="home-profile-main">
            <div className="home-profile-avatar"><Avatar name={profile.display_name} username={profile.username} size="xl" /></div>
            <div className="home-profile-copy">
              <p className="home-card-kicker"><span />Your builder profile</p>
              <h2>Let the right people see what you bring.</h2>
              <p>Make your profile a clear snapshot of your skills, your interests, and what you want to build.</p>
              <Link href="/profile" className="home-primary-link">Review your profile <span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <div className="home-completion">
            <div className="home-completion-head"><span>Profile strength</span><strong>{completion}<small>%</small></strong></div>
            <div className="home-completion-track" role="progressbar" aria-label="Profile strength" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><span style={{ width: `${completion}%` }} /></div>
            <p>{completion === 100 ? "Looking good. Your profile is ready to meet its crew." : "A few more details will help collaborators get to know you."}</p>
          </div>
        </section>

        <section className="home-projects-section">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="workspace-eyebrow">Keep building</p><h2>Your projects</h2></div>
            <div className="flex flex-wrap gap-3">
              <Link href="/projects" className="secondary-button">Discover projects</Link>
              <Link href="/projects/new" className="primary-button">Create a project</Link>
            </div>
          </div>
          {ownedProjects.error ? <p className="mt-5 text-sm text-[#9e4639]" role="alert">We couldn&apos;t load your projects. Please refresh to try again.</p> : ownedProjects.projects.length ? (
            <div className="project-grid mt-5">
              {ownedProjects.projects.map((project) => <ProjectCard key={project.id} project={project} />)}
            </div>
          ) : (
            <div className="home-projects-empty">
              <div><h3>You haven&apos;t created a project yet.</h3><p>Have an idea worth building?</p></div>
              <Link href="/projects/new" className="home-text-link">Start your first project <span aria-hidden="true">↗</span></Link>
            </div>
          )}
        </section>

        <div className="home-lower-grid">
          <section className="home-next-card">
            <div className="home-card-topline"><span className="home-index">01</span><span className="home-card-tag">Your next move</span></div>
            <h2>Make your profile feel like you.</h2>
            <p>Update your intro, add a skill, or tell your future collaborators what you’re looking for.</p>
            <Link href="/profile" className="home-text-link">Edit profile <span aria-hidden="true">↗</span></Link>
          </section>

          <section className="home-coming-card">
            <div className="home-card-topline"><span className="home-index">02</span><span className="home-card-tag">Building together</span></div>
            <h2>Your crew</h2>
            <p>Projects you&apos;re building with others.</p>
            {crewProjects.error ? <p className="mt-4 text-sm text-[#9e4639]" role="alert">We couldn&apos;t load your crew. Please try again.</p> : crewProjects.projects.length ? <div className="mt-4 space-y-2">{crewProjects.projects.slice(0, 2).map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="home-crew-project"><span className="truncate">{project.title}</span><span>{project.crew_count}</span></Link>)}</div> : <p className="mt-4 text-sm text-[#625d53]">You haven&apos;t joined a crew yet.</p>}
            <Link href="/my-crew" className="home-text-link">View my crew <span aria-hidden="true">â†—</span></Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
