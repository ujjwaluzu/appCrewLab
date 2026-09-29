import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Avatar } from "@/components/ui/Avatar";
import { getIntentLabel } from "@/data/intents";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getProjects, getProjectsForProfileCrew } from "@/lib/projects";
import { getCurrentUserProfile, getPublicProfileByUsername } from "@/lib/profile";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const result = await getPublicProfileByUsername(username);
  if (!result.profile) return { title: "Builder profile — CrewLab" };
  const name = result.profile.display_name || result.profile.username || "CrewLab builder";
  return {
    title: `${name} (@${result.profile.username}) — CrewLab`,
    description: result.profile.bio || `Explore ${name}'s projects and skills on CrewLab.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const auth = requireResolvedAuthState(await getAuthState());
  if (auth.status === "onboarding-incomplete") redirect("/onboarding");
  const viewer = await getCurrentUserProfile(auth.user.id);

  const { username } = await params;
  const result = await getPublicProfileByUsername(username);
  if (result.error) {
    return <AppShell profile={viewer} active="profile"><div className="project-empty-state" role="alert"><h1>We couldn&apos;t load this profile.</h1><p>Please refresh to try again.</p></div></AppShell>;
  }
  if (!result.profile) notFound();

  const person = result.profile;
  const displayName = person.display_name || person.username || "CrewLab builder";
  const [projectsResult, crewResult] = await Promise.all([
    getProjects({ ownerId: person.id, limit: 48 }),
    getProjectsForProfileCrew(person.id),
  ]);

  return <AppShell profile={viewer} active="profile">
    <div className="workspace-page mx-auto max-w-6xl public-profile-page">
      <header className="public-profile-hero">
        <div className="public-profile-identity">
          <div className="profile-avatar-frame"><Avatar name={displayName} username={person.username} size="xl" /></div>
          <div className="min-w-0">
            <span className="profile-member-label"><span />CrewLab builder</span>
            <h1>{displayName}</h1>
            <p className="profile-username">@{person.username}</p>
            {person.intents.length ? <div className="public-profile-intents" aria-label="Builder interests">{person.intents.map((intent) => <span key={intent}>{getIntentLabel(intent)}</span>)}</div> : null}
          </div>
        </div>
        {person.skills.length ? <section className="public-profile-skills" aria-labelledby="public-profile-skills-heading"><h2 id="public-profile-skills-heading">Skills</h2><div>{person.skills.map((skill) => <span key={skill.id || skill.slug}>{skill.name}</span>)}</div></section> : null}
      </header>

      {person.bio ? <section className="public-profile-section" aria-labelledby="public-profile-about-heading"><div className="profile-section-heading"><div><p className="workspace-eyebrow">The builder behind the work</p><h2 id="public-profile-about-heading">About</h2></div></div><p className="public-profile-about">{person.bio}</p></section> : null}

      <section className="public-profile-section" aria-labelledby="public-profile-projects-heading">
        <div className="profile-section-heading"><div><p className="workspace-eyebrow">Ideas in motion</p><h2 id="public-profile-projects-heading">Projects</h2></div><span className="profile-section-count">{projectsResult.projects.length}</span></div>
        {projectsResult.error ? <p className="profile-empty-copy" role="alert">We couldn&apos;t load these projects. Please refresh to try again.</p> : projectsResult.projects.length ? <div className="project-grid mt-5">{projectsResult.projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div> : <p className="profile-empty-copy">{displayName} hasn&apos;t shared a project yet.</p>}
      </section>

      {crewResult.error ? <section className="public-profile-section" aria-labelledby="public-profile-crew-heading"><div className="profile-section-heading"><div><p className="workspace-eyebrow">Building together</p><h2 id="public-profile-crew-heading">Building with others</h2></div></div><p className="profile-empty-copy" role="alert">We couldn&apos;t load these crew projects. Please refresh to try again.</p></section> : crewResult.projects.length ? <section className="public-profile-section" aria-labelledby="public-profile-crew-heading"><div className="profile-section-heading"><div><p className="workspace-eyebrow">Building together</p><h2 id="public-profile-crew-heading">Building with others</h2></div><span className="profile-section-count">{crewResult.projects.length}</span></div><div className="public-profile-crew-list">{crewResult.projects.map((project) => <article className="public-profile-crew-card" key={project.id}><div><p className="workspace-eyebrow">{project.status}</p><h3>{project.title}</h3><p>{project.short_description || "A project taking shape on CrewLab."}</p><p className="public-profile-crew-count">Crew of {project.crew_count}</p></div><Link href={`/projects/${project.id}`} className="secondary-button shrink-0">View project</Link></article>)}</div></section> : null}
    </div>
  </AppShell>;
}
