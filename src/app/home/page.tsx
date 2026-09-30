import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getHomeDashboardData } from "@/lib/dashboard";
import { getCurrentUserProfile } from "@/lib/profile";
import { getProfileCompletion } from "@/lib/profile-utils";
import { ProjectCard } from "@/components/projects/ProjectCard";

export const dynamic = "force-dynamic";

type HomeIconName = "projects" | "crew" | "incoming" | "pending";

function HomeIcon({ name }: { name: HomeIconName }) {
  const attrs = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "projects") return <svg viewBox="0 0 24 24" aria-hidden="true" {...attrs}><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" /><path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12v8.5" /></svg>;
  if (name === "crew") return <svg viewBox="0 0 24 24" aria-hidden="true" {...attrs}><circle cx="9" cy="8" r="3" /><path d="M3.5 19v-1.2a5.5 5.5 0 0 1 11 0V19zM16 5.5a3 3 0 0 1 0 5.8M17 13a5 5 0 0 1 3.5 4.8V19h-3" /></svg>;
  if (name === "incoming") return <svg viewBox="0 0 24 24" aria-hidden="true" {...attrs}><path d="M12 3v12m-4-4 4 4 4-4" /><path d="M5 14v5h14v-5" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...attrs}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.2 2" /></svg>;
}

function HomeStat({ label, count, href, icon, error }: { label: string; count: number | null; href: string; icon: HomeIconName; error: boolean }) {
  return <Link href={href} className="home-stat-card"><span className="home-stat-icon"><HomeIcon name={icon} /></span><span className="home-stat-label">{label}</span><strong>{error || count === null ? "N/A" : count}</strong>{error ? <span className="home-stat-support is-error">Temporarily unavailable</span> : null}</Link>;
}

export default async function HomePage() {
  const auth = requireResolvedAuthState(await getAuthState());
  if (auth.status === "onboarding-incomplete") redirect("/onboarding");

  const profile = await getCurrentUserProfile(auth.user.id);

  const name = profile.display_name || profile.username || "Builder";
  const firstName = name.trim().split(/\s+/)[0] || "Builder";
  const completion = getProfileCompletion(profile, profile.skills.length);
  const dashboard = await getHomeDashboardData(auth.user.id);
  return (
    <AppShell profile={profile} active="home">
      <div className="workspace-page mx-auto max-w-6xl">
        <header className="workspace-page-heading home-page-heading animate-fade-in">
          <div>
            <p className="workspace-eyebrow">Your workspace</p>
            <h1>Welcome back, <span>{firstName}.</span></h1>
            <p className="workspace-lede">A little progress today can turn into something great tomorrow.</p>
          </div>
        </header>

        <section className="home-summary-grid" aria-label="Your CrewLab activity">
          <HomeStat label="My Projects" count={dashboard.projects.count} href="/projects" icon="projects" error={dashboard.projects.error} />
          <HomeStat label="My Crew" count={dashboard.crew.count} href="/my-crew" icon="crew" error={dashboard.crew.error} />
          <HomeStat label="Incoming Applications" count={dashboard.incoming.count} href="/applications" icon="incoming" error={dashboard.incoming.error} />
          <HomeStat label="My Pending Applications" count={dashboard.outgoing.count} href="/applications" icon="pending" error={dashboard.outgoing.error} />
        </section>

        {completion < 100 ? <aside className="home-profile-reminder" aria-labelledby="home-profile-reminder-heading">
          <div className="home-profile-reminder-copy">
            <p className="workspace-eyebrow">Profile setup</p>
            <h2 id="home-profile-reminder-heading">Help collaborators get to know you.</h2>
            <p>A few more details can make your builder profile more useful.</p>
          </div>
          <div className="home-profile-reminder-progress">
            <div><span>Profile strength</span><strong>{completion}%</strong></div>
            <div className="home-completion-track" role="progressbar" aria-label="Profile strength" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><span style={{ width: `${completion}%` }} /></div>
          </div>
          <Link href="/profile" className="secondary-button">Complete profile</Link>
        </aside> : null}

        <section className="home-projects-section">
          <div>
            <p className="workspace-eyebrow">Ideas in motion</p>
            <div className="home-projects-title-row"><h2>My projects</h2><Link href="/my-projects" className="home-view-all">View all projects <span aria-hidden="true">→</span></Link></div>
          </div>
          {dashboard.projects.error ? <p className="mt-5 text-sm text-[#9e4639]" role="alert">We couldn&apos;t load your projects. Please refresh to try again.</p> : dashboard.projects.items.length ? (
            <div className="project-grid mt-5">
              {dashboard.projects.items.map((project) => <ProjectCard key={project.id} project={project} showUpdatedAt />)}
            </div>
          ) : (
            <div className="home-projects-empty">
              <div><h3>You haven&apos;t created a project yet.</h3><p>Have an idea worth building?</p></div>
              <Link href="/projects/new" className="home-text-link">Start your first project <span aria-hidden="true">↗</span></Link>
            </div>
          )}
        </section>

        <section className="home-crew-section">
          <div className="home-crew-heading">
            <div><p className="workspace-eyebrow">Building together</p><h2>My Crew</h2><p>Projects you&apos;re building with others.</p></div>
            <Link href="/my-crew" className="home-view-all">View my crew <span aria-hidden="true">→</span></Link>
          </div>
          {dashboard.crew.error ? <p className="mt-5 text-sm text-[#9e4639]" role="alert">We couldn&apos;t load your crew. Please try again.</p> : dashboard.crew.items.length ? <div className="home-crew-project-list">{dashboard.crew.items.map((project) => <ProjectCard key={project.id} project={project} />)}</div> : <div className="home-crew-empty"><p>You haven&apos;t joined a crew yet.</p><Link href="/projects" className="home-text-link">Explore projects <span aria-hidden="true">→</span></Link></div>}
        </section>
      </div>
    </AppShell>
  );
}
