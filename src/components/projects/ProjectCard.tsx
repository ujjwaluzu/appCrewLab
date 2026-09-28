import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import type { Project } from "@/lib/projects";

export function ProjectCard({ project }: { project: Project }) {
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
        <Avatar name={name} username={project.owner?.username} size="sm" />
        <span className="min-w-0"><span className="block truncate">{name}</span>{project.owner?.username ? <span className="block truncate text-xs font-medium text-[#83877f]">@{project.owner.username}</span> : null}</span>
      </div>
      <p className="project-card-crew-count">Crew: {project.crew_count}</p>
    </article>
  );
}
