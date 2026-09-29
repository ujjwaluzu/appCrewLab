import { getCrewProfilesByIds, type CrewProfile } from "@/lib/crew";
import { getDashboardCrewProjects, getDashboardOwnedProjects, getProjectsByIds, type Project } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export type IncomingApplicationPreview = {
  id: string;
  created_at: string;
  project_id: string;
  project_title: string;
  applicant: CrewProfile;
  status: "pending";
};

export type OutgoingApplicationPreview = {
  id: string;
  created_at: string;
  project: Project;
  status: "pending";
};

export type HomeDashboardData = {
  projects: { items: Project[]; count: number | null; error: boolean };
  crew: { items: Project[]; count: number | null; error: boolean };
  incoming: { items: IncomingApplicationPreview[]; count: number | null; error: boolean };
  outgoing: { items: OutgoingApplicationPreview[]; count: number | null; error: boolean };
};

async function getIncomingApplications(userId: string): Promise<HomeDashboardData["incoming"]> {
  try {
    const supabase = await createClient();
    const { data, count, error } = await supabase
      .from("join_requests")
      .select("id, project_id, user_id, created_at, project:projects!inner(id, title, owner_id)", { count: "exact" })
      .eq("project.owner_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3);
    if (error) return { items: [], count: null, error: true };

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      project_id: string;
      user_id: string;
      created_at: string;
      project: { id: string; title: string; owner_id: string } | Array<{ id: string; title: string; owner_id: string }>;
    }>;
    const profiles = await getCrewProfilesByIds(rows.map((row) => row.user_id));
    if (profiles.error) return { items: [], count: count ?? 0, error: true };

    const items = rows.flatMap((row) => {
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      if (!project || project.owner_id !== userId) return [];
      return [{
        id: row.id,
        created_at: row.created_at,
        project_id: row.project_id,
        project_title: project.title,
        applicant: profiles.profiles.get(row.user_id) ?? {
          id: row.user_id,
          display_name: "CrewLab builder",
          username: null,
          skills: [],
        },
        status: "pending" as const,
      }];
    });
    return { items, count: count ?? 0, error: false };
  } catch {
    return { items: [], count: null, error: true };
  }
}

async function getOutgoingApplications(userId: string): Promise<HomeDashboardData["outgoing"]> {
  try {
    const supabase = await createClient();
    const { data, count, error } = await supabase
      .from("join_requests")
      .select("id, project_id, created_at", { count: "exact" })
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3);
    if (error) return { items: [], count: null, error: true };

    const rows = data ?? [];
    const projects = await getProjectsByIds(rows.map((row) => row.project_id), { strict: true });
    if (projects.error) return { items: [], count: count ?? 0, error: true };
    const projectById = new Map(projects.projects.map((project) => [project.id, project]));
    const items = rows.flatMap((row) => {
      const project = projectById.get(row.project_id);
      return project ? [{ id: row.id, created_at: row.created_at, project, status: "pending" as const }] : [];
    });
    return { items, count: count ?? 0, error: false };
  } catch {
    return { items: [], count: null, error: true };
  }
}

export async function getHomeDashboardData(userId: string): Promise<HomeDashboardData> {
  const [projects, crew, incoming, outgoing] = await Promise.all([
    (async () => {
      try {
        const result = await getDashboardOwnedProjects(userId, 4);
        return { items: result.projects, count: result.count, error: result.error };
      } catch {
        return { items: [], count: null, error: true };
      }
    })(),
    (async () => {
      try {
        const result = await getDashboardCrewProjects(userId, 3);
        return { items: result.projects, count: result.count, error: result.error };
      } catch {
        return { items: [], count: null, error: true };
      }
    })(),
    getIncomingApplications(userId),
    getOutgoingApplications(userId),
  ]);
  return { projects, crew, incoming, outgoing };
}
