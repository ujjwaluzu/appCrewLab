import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { getAuthState } from "@/lib/auth";
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
  return <Link href={href} className="home-stat-card"><span className="home-stat-icon"><HomeIcon name={icon} /></span><span className="home-stat-label">{label}</span><strong>{error || count === null ? "—" : count}</strong><span className={error ? "home-stat-support is-error" : "home-stat-support"}>{error ? "Temporarily unavailable" : "View details"}</span></Link>;
}

function formatDashboardDate(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function HomePage() {
  const auth = await getAuthState();
  if (!auth.user) redirect("/auth");
  if (!auth.onboardingCompleted) redirect("/onboarding");

  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/onboarding");

  const name = profile.display_name || profile.username || "Builder";
  const firstName = name.trim().split(/\s+/)[0] || "Builder";
  const completion = getProfileCompletion(profile, profile.skills.length);
  const dashboard = await getHomeDashboardData(auth.user.id);
  const incomingTarget = dashboard.incoming.items[0] ? `/projects/${dashboard.incoming.items[0].project_id}#join-requests` : "/projects";
  const outgoingTarget = dashboard.outgoing.items[0] ? `/projects/${dashboard.outgoing.items[0].project.id}` : "/projects";

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

        <nav className="home-quick-actions" aria-label="Quick actions">
          <Link href="/projects/new" className="primary-button">Create a project <span aria-hidden="true">↗</span></Link>
          <Link href="/projects" className="secondary-button">Explore projects</Link>
          <Link href="/my-crew" className="secondary-button">View My Crew</Link>
        </nav>

        {completion < 100 ? <section className="home-profile-card">
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
        </section> : null}

        <section className="home-summary-grid" aria-label="Your CrewLab activity">
          <HomeStat label="My Projects" count={dashboard.projects.count} href="/projects" icon="projects" error={dashboard.projects.error} />
          <HomeStat label="My Crew" count={dashboard.crew.count} href="/my-crew" icon="crew" error={dashboard.crew.error} />
          <HomeStat label="Incoming Applications" count={dashboard.incoming.count} href={incomingTarget} icon="incoming" error={dashboard.incoming.error} />
          <HomeStat label="My Pending Applications" count={dashboard.outgoing.count} href={outgoingTarget} icon="pending" error={dashboard.outgoing.error} />
        </section>

        <section className="home-projects-section">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="workspace-eyebrow">Ideas in motion</p>
              <div className="home-projects-title-row"><h2>My projects</h2><Link href="/projects" className="home-view-all">View all projects <span aria-hidden="true">→</span></Link></div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/projects/new" className="primary-button">Create a project</Link>
            </div>
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
        <div className="home-dashboard-applications">
          <section className="home-dashboard-section" aria-labelledby="home-incoming-heading">
            <div className="home-dashboard-section-heading"><div><p className="workspace-eyebrow">For your projects</p><h2 id="home-incoming-heading">Incoming applications</h2></div><Link href={incomingTarget} className="home-view-all">View all <span aria-hidden="true">→</span></Link></div>
            {dashboard.incoming.error ? <p className="home-dashboard-error" role="alert">We couldn&apos;t load incoming applications. Please try again.</p> : dashboard.incoming.items.length ? <ul className="home-application-list">{dashboard.incoming.items.map((application) => {
              const applicantName = application.applicant.display_name || application.applicant.username || "CrewLab builder";
              const applicantHref = application.applicant.username ? `/u/${encodeURIComponent(application.applicant.username)}` : null;
              return <li className="home-application-card" key={application.id}>
                <div className="home-application-person">{applicantHref ? <Link href={applicantHref} aria-label={`View ${applicantName}&apos;s profile`}><Avatar name={applicantName} username={application.applicant.username} size="md" /></Link> : <Avatar name={applicantName} size="md" />}<div className="min-w-0"><p className="truncate font-semibold text-[#26362c]">{applicantHref ? <Link href={applicantHref} className="crew-profile-link">{applicantName}</Link> : applicantName}</p><p className="truncate text-xs text-[#7a7466]">{applicantHref ? <Link href={applicantHref} className="crew-profile-link">@{application.applicant.username}</Link> : "CrewLab builder"}</p></div><span className="home-pending-badge">Pending</span></div>
                {application.applicant.skills.length ? <div className="home-application-skills">{application.applicant.skills.slice(0, 3).map((skill) => <span key={skill.id}>{skill.name}</span>)}</div> : null}
                <div className="home-application-meta"><span>For <strong>{application.project_title}</strong></span><time dateTime={application.created_at}>{formatDashboardDate(application.created_at)}</time></div>
                <Link href={`/projects/${application.project_id}#join-requests`} className="home-review-link">Review application <span aria-hidden="true">→</span></Link>
              </li>;
            })}</ul> : <div className="home-dashboard-empty home-dashboard-empty-compact"><div><h3>No incoming applications.</h3><p>New applications for your projects will show up here.</p></div></div>}
          </section>

          <section className="home-dashboard-section" aria-labelledby="home-pending-heading">
            <div className="home-dashboard-section-heading"><div><p className="workspace-eyebrow">Your applications</p><h2 id="home-pending-heading">My pending applications</h2></div><Link href="/projects" className="home-view-all">Explore <span aria-hidden="true">→</span></Link></div>
            {dashboard.outgoing.error ? <p className="home-dashboard-error" role="alert">We couldn&apos;t load your applications. Please try again.</p> : dashboard.outgoing.items.length ? <ul className="home-outgoing-list">{dashboard.outgoing.items.map((application) => <li className="home-outgoing-card" key={application.id}><div className="min-w-0"><Link href={`/projects/${application.project.id}`} className="home-outgoing-title">{application.project.title}</Link><p>Owner: {application.project.owner?.username ? <Link href={`/u/${encodeURIComponent(application.project.owner.username)}`} className="crew-profile-link">{application.project.owner.display_name || application.project.owner.username} · @{application.project.owner.username}</Link> : application.project.owner?.display_name || "CrewLab builder"}</p><time dateTime={application.created_at}>{formatDashboardDate(application.created_at)}</time></div><span className="home-pending-badge">Pending</span></li>)}</ul> : <div className="home-dashboard-empty home-dashboard-empty-compact"><div><h3>No pending applications.</h3><p>Apply to a project when you&apos;re ready to build together.</p></div><Link href="/projects" className="home-text-link">Explore projects <span aria-hidden="true">→</span></Link></div>}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
