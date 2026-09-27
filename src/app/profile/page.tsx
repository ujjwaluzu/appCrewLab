import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { Avatar } from "@/components/ui/Avatar";
import { getIntentLabel } from "@/data/intents";
import { getAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
import { getProfileCompletion } from "@/lib/profile-utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const auth = await getAuthState();
  if (!auth.user) redirect("/auth");
  if (!auth.onboardingCompleted) redirect("/onboarding");

  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/onboarding");

  const displayName = profile.display_name || profile.username || "CrewLab builder";
  const completion = getProfileCompletion(profile, profile.skills.length);

  return (
    <AppShell profile={profile} active="profile">
      <div className="workspace-page profile-page mx-auto max-w-6xl">
        <header className="workspace-page-heading profile-page-heading animate-fade-in">
          <div>
            <p className="workspace-eyebrow">Your profile / Builder card</p>
            <h1>A clear picture of <span>what you bring.</span></h1>
            <p className="workspace-lede">Show people what you love working on and where you want to go next.</p>
          </div>
          <ProfileEditor profile={profile} />
        </header>

        <section className="profile-hero-card">
          <div className="profile-hero-stamp">CREWLAB<br />BUILDER</div>
          <div className="profile-identity">
            <div className="profile-avatar-frame"><Avatar name={profile.display_name} username={profile.username} size="xl" /></div>
            <div className="profile-identity-copy">
              <span className="profile-member-label"><span />Builder profile</span>
              <h2>{displayName}</h2>
              <p className="profile-username">@{profile.username || "profile"}</p>
              <p className="profile-bio">{profile.bio || "Add a short intro so future collaborators can get to know you."}</p>
            </div>
          </div>
          <div className="profile-quick-stats">
            <div><strong>{profile.skills.length.toString().padStart(2, "0")}</strong><span>Skills</span></div>
            <div><strong>{profile.intents.length.toString().padStart(2, "0")}</strong><span>Directions</span></div>
            <div><strong>{completion}<small>%</small></strong><span>Complete</span></div>
          </div>
        </section>

        <div className="profile-content-grid">
          <section className="profile-detail-card">
            <div className="profile-section-heading"><div><p className="workspace-eyebrow">What you bring</p><h2>Your skills</h2></div><span className="profile-section-count">{profile.skills.length}</span></div>
            {profile.skills.length ? (
              <div className="profile-skill-list">{profile.skills.map((skill, index) => <span key={skill.id || skill.slug} className="profile-skill-chip"><span>{String(index + 1).padStart(2, "0")}</span>{skill.name}</span>)}</div>
            ) : <p className="profile-empty-copy">Add a few skills to help people see how you can contribute to a project.</p>}
          </section>

          <section className="profile-detail-card profile-intent-card">
            <div className="profile-section-heading"><div><p className="workspace-eyebrow">Where you’re headed</p><h2>Looking for</h2></div><span className="profile-section-count">{profile.intents.length}</span></div>
            {profile.intents.length ? (
              <div className="profile-intent-list">{profile.intents.map((intent, index) => <div key={intent} className="profile-intent-row"><span>{String(index + 1).padStart(2, "0")}</span><p>{getIntentLabel(intent)}</p><b aria-hidden="true">↗</b></div>)}</div>
            ) : <p className="profile-empty-copy">Add what you’re looking for so your next step can find you.</p>}
          </section>
        </div>

        <section className="profile-progress-card">
          <div className="profile-progress-copy"><p className="workspace-eyebrow">Profile strength</p><h2>{completion === 100 ? "You’re all set." : `You’re ${completion}% of the way there.`}</h2><p>{completion === 100 ? "Your builder card is ready to introduce you to the CrewLab community." : "Complete the remaining details to make your builder card more useful to collaborators."}</p></div>
          <div className="profile-progress-visual"><strong>{completion}<small>%</small></strong><div className="profile-progress-track" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><span style={{ width: `${completion}%` }} /></div></div>
        </section>
      </div>
    </AppShell>
  );
}
