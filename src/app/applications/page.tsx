import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { OwnerJoinRequests } from "@/components/crew/CrewControls";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getOutgoingApplications } from "@/lib/dashboard";
import { getPendingOwnerApplications } from "@/lib/crew";
import { getCurrentUserProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

function formatApplicationDate(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function ApplicationCount({ count, error }: { count: number | null; error: boolean }) {
  return <span className={`application-count ${error ? "is-error" : ""}`}>{error || count === null ? "N/A" : count}</span>;
}

export default async function ApplicationsPage() {
  const auth = requireResolvedAuthState(await getAuthState());
  if (auth.status === "onboarding-incomplete") redirect("/onboarding");

  const [profile, incoming, outgoing] = await Promise.all([
    getCurrentUserProfile(auth.user.id),
    getPendingOwnerApplications(auth.user.id),
    getOutgoingApplications(auth.user.id),
  ]);

  return <AppShell profile={profile} active="applications">
    <div className="workspace-page mx-auto max-w-6xl">
      <header className="workspace-page-heading applications-page-heading animate-fade-in">
        <div>
          <p className="workspace-eyebrow">Your workspace</p>
          <h1>Applications<span>.</span></h1>
          <p className="workspace-lede">Review builders interested in your projects and keep track of the requests you&apos;ve sent.</p>
        </div>
      </header>

      <div className="applications-grid">
        <section className="applications-panel" aria-labelledby="incoming-applications-heading">
          <header className="applications-panel-heading">
            <div><p className="workspace-eyebrow">For your projects</p><h2 id="incoming-applications-heading">Incoming</h2></div>
            <ApplicationCount count={incoming.count} error={incoming.error} />
          </header>
          <p className="applications-panel-description">Builders waiting for your review.{incoming.count !== null && incoming.count > incoming.requests.length ? ` Showing the ${incoming.requests.length} most recent.` : ""}</p>
          {incoming.error ? <p className="applications-error" role="alert">We couldn&apos;t load incoming applications. Please try again.</p> : incoming.requests.length ? <div className="applications-review-list"><OwnerJoinRequests requests={incoming.requests} showReviewLabel /></div> : <div className="applications-empty"><span className="applications-empty-icon" aria-hidden="true">↙</span><h3>No incoming applications</h3><p>New requests to join your projects will appear here.</p><Link href="/projects" className="secondary-button">Manage projects</Link></div>}
        </section>

        <section className="applications-panel" aria-labelledby="sent-applications-heading">
          <header className="applications-panel-heading">
            <div><p className="workspace-eyebrow">Your requests</p><h2 id="sent-applications-heading">Sent by you</h2></div>
            <ApplicationCount count={outgoing.count} error={outgoing.error} />
          </header>
          <p className="applications-panel-description">Pending applications you&apos;ve sent to project owners.{outgoing.count !== null && outgoing.count > outgoing.items.length ? ` Showing the ${outgoing.items.length} most recent.` : ""}</p>
          {outgoing.error ? <p className="applications-error" role="alert">We couldn&apos;t load your applications. Please try again.</p> : outgoing.items.length ? <ul className="applications-list">{outgoing.items.map((application) => {
            const ownerName = application.project.owner?.display_name || application.project.owner?.username || "CrewLab builder";
            const ownerHref = application.project.owner?.username ? `/u/${encodeURIComponent(application.project.owner.username)}` : null;
            return <li className="applications-list-card" key={application.id}>
              <div className="applications-sent-heading"><div className="min-w-0"><Link href={`/projects/${application.project.id}`} className="applications-project-title">{application.project.title}</Link><p className="applications-owner">Project by {ownerHref ? <Link href={ownerHref} className="crew-profile-link">{ownerName}</Link> : ownerName}</p></div><span className="home-pending-badge">Pending</span></div>
              <footer className="applications-card-footer"><time dateTime={application.created_at}>Sent {formatApplicationDate(application.created_at)}</time><Link href={`/projects/${application.project.id}`} className="applications-card-action">View project <span aria-hidden="true">→</span></Link></footer>
            </li>;
          })}</ul> : <div className="applications-empty"><span className="applications-empty-icon" aria-hidden="true">↗</span><h3>No pending applications</h3><p>When you apply to join a project, your request will be listed here.</p><Link href="/projects" className="secondary-button">Explore projects</Link></div>}
        </section>
      </div>
    </div>
  </AppShell>;
}
