import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { getAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
import { getProfileCompletion } from "@/lib/profile-utils";

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

        <div className="home-lower-grid">
          <section className="home-next-card">
            <div className="home-card-topline"><span className="home-index">01</span><span className="home-card-tag">Your next move</span></div>
            <h2>Make your profile feel like you.</h2>
            <p>Update your intro, add a skill, or tell your future collaborators what you’re looking for.</p>
            <Link href="/profile" className="home-text-link">Edit profile <span aria-hidden="true">↗</span></Link>
          </section>

          <section className="home-coming-card">
            <div className="home-card-topline"><span className="home-index">02</span><span className="home-card-tag">On the way</span></div>
            <h2>Projects worth showing up for.</h2>
            <p>We’re making room for ideas, collaborators, and the momentum that happens when they meet.</p>
            <div className="home-coming-art" aria-hidden="true"><span /><span /><span /><b>More soon</b></div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
