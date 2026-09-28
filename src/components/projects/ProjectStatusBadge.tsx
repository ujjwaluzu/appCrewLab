import type { ProjectStatus } from "@/lib/projects";

const statusLabels: Record<ProjectStatus, string> = {
  idea: "Idea",
  building: "Building",
  paused: "Paused",
  completed: "Completed",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`project-status project-status-${status}`}>{statusLabels[status]}</span>;
}
