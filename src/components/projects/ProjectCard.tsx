import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import type { CrewProfile } from "@/lib/crew";
import type { Project } from "@/lib/projects";

export function ProjectCard({ project, crewProfiles = [], showUpdatedAt = false }: { project: Project; crewProfiles?: CrewProfile[]; showUpdatedAt?: boolean }) {
  const name = project.owner?.display_name || project.owner?.username || "CrewLab builder";

  return (
    <article className="project-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/projects/${project.id}`} className="project-card-title">{project.title}</Link>
          <p className="project-card-description">{project.short_description || "An idea taking shape on CrewLab."}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>
      {project.skills.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {project.skills.slice(0, 4).map((skill) => <span className="project-skill-chip" key={skill.id}>{skill.name}</span>)}
          {project.skills.length > 4 ? <span className="project-skill-chip">+{project.skills.length - 4}</span> : null}
        </div>
      ) : <p className="mt-5 text-xs text-[#83877f]">Skills to be decided</p>}
      <div className="project-card-owner">
        {project.owner?.username ? <Link href={`/u/${encodeURIComponent(project.owner.username)}`} className="project-card-owner-link" aria-label={`View ${name}'s profile`}><Avatar name={name} username={project.owner.username} size="sm" /></Link> : <Avatar name={name} size="sm" />}
        <span className="min-w-0"><span className="block truncate">{project.owner?.username ? <Link href={`/u/${encodeURIComponent(project.owner.username)}`} className="project-card-owner-name">{name}</Link> : name}</span>{project.owner?.username ? <Link href={`/u/${encodeURIComponent(project.owner.username)}`} className="block truncate text-xs font-medium text-[#83877f]">@{project.owner.username}</Link> : null}</span>
      </div>
      {crewProfiles.length ? <div className="project-card-crew-profiles" aria-label="Other crew members">{crewProfiles.slice(0, 4).map((member) => member.username ? <Link key={member.id} href={`/u/${encodeURIComponent(member.username)}`} className="project-card-crew-person" title={`View ${member.display_name}'s profile`}><Avatar name={member.display_name} username={member.username} size="sm" /><span>{member.display_name}</span></Link> : null)}{crewProfiles.length > 4 ? <span className="project-card-crew-more">+{crewProfiles.length - 4}</span> : null}</div> : null}
      <p className="project-card-crew-count">Crew: {project.crew_count}</p>
      {showUpdatedAt ? <p className="project-card-updated">Updated {new Date(project.updated_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</p> : null}
    </article>
  );
}
