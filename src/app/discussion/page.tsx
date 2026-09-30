import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
import { getDiscussionProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function DiscussionPage() {
  const auth = requireResolvedAuthState(await getAuthState());
  if (auth.status === "onboarding-incomplete") redirect("/onboarding");

  const [profile, result] = await Promise.all([
    getCurrentUserProfile(auth.user.id),
    getDiscussionProjects(auth.user.id),
  ]);

  return <AppShell profile={profile} active="discussion">
    <div className="workspace-page mx-auto max-w-6xl">
      <header className="workspace-page-heading discussion-page-heading animate-fade-in">
        <div><p className="workspace-eyebrow">Your crew</p><h1>Project <span>discussions.</span></h1><p className="workspace-lede">Choose a project to open its shared discussion space.</p></div>
      </header>
      {result.error ? <div className="project-empty-state" role="alert"><h2>We couldn&apos;t load your project rooms.</h2><p>Please try again in a moment.</p><Link href="/discussion" className="secondary-button mt-5">Try again</Link></div> : result.projects.length ? <div className="discussion-project-grid">{result.projects.map((project) => <Link key={project.id} href={`/discussion/${project.id}`} className="discussion-project-card">
        <div className="discussion-project-card-top"><span className="discussion-project-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3.5-.7L4 20l1.2-3.7A7.1 7.1 0 0 1 4 12.5 7.5 7.5 0 0 1 12 5a7.5 7.5 0 0 1 8 6.5Z" /></svg></span><ProjectStatusBadge status={project.status} /></div>
        <h2>{project.title}</h2>
        <p className="discussion-project-description">{project.short_description || "A shared space for your project crew."}</p>
        <div className="discussion-project-meta"><span>{project.crew_count} {project.crew_count === 1 ? "member" : "members"}</span><span>Open discussion <span aria-hidden="true">→</span></span></div>
      </Link>)}</div> : <div className="project-empty-state"><span className="project-empty-mark" aria-hidden="true">✳</span><h2>No project discussions yet.</h2><p>Join a project or create one to start a shared discussion with its crew.</p><Link href="/projects" className="primary-button mt-5">Explore projects</Link></div>}
    </div>
  </AppShell>;
}