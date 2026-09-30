import { createClient } from "@/lib/supabase/server";

export type ProjectStatus = "idea" | "building" | "paused" | "completed";

export type ProjectSkill = {
  id: string;
  slug: string;
  name: string;
};

export type ProjectOwner = {
  id: string;
  display_name: string | null;
  username: string | null;
};

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  skills: ProjectSkill[];
  owner: ProjectOwner | null;
  crew_count: number;
};

type VisibleOwnerRow = { profile_id: string; display_name: string | null; username: string | null };

type ProjectRow = Omit<Project, "skills" | "owner" | "crew_count"> & {
  project_skills?: Array<{ skill: ProjectSkill | ProjectSkill[] | null }>;
};

function normalizeProject(row: ProjectRow, owner: ProjectOwner | null): Project {
  const skills = (row.project_skills ?? []).flatMap(({ skill }) => {
    if (!skill) return [];
    return Array.isArray(skill) ? skill : [skill];
  });

  return { ...row, skills, owner, crew_count: 1 };
}

async function attachOwners(rows: ProjectRow[], strict = false) {
  const ownerIds = [...new Set(rows.map((row) => row.owner_id))];
  if (ownerIds.length === 0) return rows.map((row) => normalizeProject(row, null));

  const supabase = await createClient();
  const { data: owners, error } = await supabase.rpc("get_visible_project_profiles", { target_profile_ids: ownerIds });
  if (error && strict) throw new Error("Could not load project owners");
  const ownerRows = (owners ?? []) as unknown as VisibleOwnerRow[];
  const ownerMap = new Map<string, ProjectOwner>(ownerRows.map((owner) => [owner.profile_id, {
    id: owner.profile_id,
    display_name: owner.display_name,
    username: owner.username,
  } as ProjectOwner]));

  return rows.map((row) => normalizeProject(row, ownerMap.get(row.owner_id) ?? null));
}

async function attachCrewCounts(projects: Project[], strict = false) {
  if (!projects.length) return projects;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .select("project_id, user_id")
    .in("project_id", projects.map((project) => project.id));
  if (error && strict) throw new Error("Could not load project crew sizes");
  const owners = new Map(projects.map((project) => [project.id, project.owner_id]));
  const counts = new Map<string, number>();
  for (const member of data ?? []) {
    if (member.user_id === owners.get(member.project_id)) continue;
    counts.set(member.project_id, (counts.get(member.project_id) ?? 0) + 1);
  }
  return projects.map((project) => ({ ...project, crew_count: 1 + (counts.get(project.id) ?? 0) }));
}

export async function getProjects(options: { query?: string; skillSlug?: string; ownerId?: string; limit?: number; page?: number } = {}) {
  const supabase = await createClient();
  const { query = "", skillSlug = "", ownerId, limit = 48, page = 1 } = options;
  let projectIds: string[] | null = null;

  if (skillSlug) {
    const { data: skill, error: skillError } = await supabase.from("skills").select("id").eq("slug", skillSlug).maybeSingle();
    if (skillError) return { projects: [] as Project[], error: true, hasMore: false };
    if (!skill) return { projects: [] as Project[], error: false, hasMore: false };
    const { data: matches, error: matchError } = await supabase.from("project_skills").select("project_id").eq("skill_id", skill.id);
    if (matchError) return { projects: [] as Project[], error: true, hasMore: false };
    projectIds = [...new Set((matches ?? []).map((row) => row.project_id))];
    if (!projectIds.length) return { projects: [] as Project[], error: false, hasMore: false };
  }

  let request = supabase
    .from("projects")
    .select("id, owner_id, title, slug, short_description, description, status, created_at, updated_at, project_skills(skill:skills(id, slug, name))")
    .order("created_at", { ascending: false })
    .range((Math.max(1, page) - 1) * limit, Math.max(1, page) * limit);

  if (ownerId) request = request.eq("owner_id", ownerId);
  if (projectIds) request = request.in("id", projectIds);

  const safeQuery = query.trim().slice(0, 80).replace(/[,%_*()]/g, " ").trim();
  if (safeQuery) {
    const term = `%${safeQuery}%`;
    request = request.or(`title.ilike.${term},short_description.ilike.${term},description.ilike.${term}`);
  }

  const { data, error } = await request;
  if (error) return { projects: [] as Project[], error: true, hasMore: false };
  const rows = (data ?? []) as unknown as ProjectRow[];
  const hasMore = rows.length > limit;
  const projects = await attachCrewCounts(await attachOwners(rows.slice(0, limit)));
  return { projects, error: false, hasMore };
}

export async function getProjectsByIds(projectIds: string[], options: { strict?: boolean } = {}) {
  const uniqueIds = [...new Set(projectIds)];
  if (!uniqueIds.length) return { projects: [] as Project[], error: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_id, title, slug, short_description, description, status, created_at, updated_at, project_skills(skill:skills(id, slug, name))")
    .in("id", uniqueIds)
    .order("created_at", { ascending: false });
  if (error) return { projects: [] as Project[], error: true };
  const rows = (data ?? []) as unknown as ProjectRow[];
  try {
    return { projects: await attachCrewCounts(await attachOwners(rows, options.strict), options.strict), error: false };
  } catch {
    return { projects: [] as Project[], error: true };
  }
}

export async function getMyCrewProjects(userId: string) {
  const supabase = await createClient();
  const [{ data: memberships, error: membershipError }, { data: ownedProjects, error: ownedError }] = await Promise.all([
    supabase.from("project_members").select("project_id").eq("user_id", userId),
    supabase.from("projects").select("id").eq("owner_id", userId),
  ]);
  if (membershipError || ownedError) return { projects: [] as Project[], error: true };

  const ownedIds = (ownedProjects ?? []).map((project) => project.id);
  const ownedProjectsWithCrew = ownedIds.length
    ? await supabase
      .from("project_members")
      .select("project_id")
      .in("project_id", ownedIds)
      .neq("user_id", userId)
    : { data: [], error: null };
  if (ownedProjectsWithCrew.error) return { projects: [] as Project[], error: true };

  const ids = [...new Set([
    ...(memberships ?? []).map((row) => row.project_id),
    ...(ownedProjectsWithCrew.data ?? []).map((row) => row.project_id),
  ])];
  return getProjectsByIds(ids);
}

export async function getDiscussionProjects(userId: string) {
  const supabase = await createClient();
  const [{ data: memberships, error: membershipError }, { data: ownedProjects, error: ownedError }] = await Promise.all([
    supabase.from("project_members").select("project_id").eq("user_id", userId),
    supabase.from("projects").select("id").eq("owner_id", userId),
  ]);
  if (membershipError || ownedError) return { projects: [] as Project[], error: true };
  const projectIds = [...new Set([
    ...(memberships ?? []).map((membership) => membership.project_id),
    ...(ownedProjects ?? []).map((project) => project.id),
  ])];
  return getProjectsByIds(projectIds, { strict: true });
}

export async function getDiscussionProject(projectId: string, userId: string) {
  const { project, error: projectError } = await getProjectById(projectId);
  if (projectError || !project) return { project: null as Project | null, error: projectError };
  if (project.owner_id === userId) return { project, error: false };

  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { project: null as Project | null, error: true };
  return { project: membership ? project : null, error: false };
}

export async function getDashboardOwnedProjects(userId: string, limit = 4) {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("projects")
    .select("id, owner_id, title, slug, short_description, description, status, created_at, updated_at, project_skills(skill:skills(id, slug, name))", { count: "exact" })
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return { projects: [] as Project[], count: null, error: true };
  const rows = (data ?? []) as unknown as ProjectRow[];
  try {
    const projects = await attachCrewCounts(await attachOwners(rows, true), true);
    return { projects, count: count ?? 0, error: false };
  } catch {
    return { projects: [] as Project[], count: null, error: true };
  }
}

export async function getDashboardCrewProjects(userId: string, limit = 3) {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);
  if (error) return { projects: [] as Project[], count: null, error: true };
  const projectIds = [...new Set((memberships ?? []).map((row) => row.project_id))];
  if (!projectIds.length) return { projects: [] as Project[], count: 0, error: false };
  const result = await getProjectsByIds(projectIds, { strict: true });
  if (result.error) return { projects: [] as Project[], count: null, error: true };
  const projects = result.projects.filter((project) => project.owner_id !== userId);
  return { projects: projects.slice(0, limit), count: projects.length, error: false };
}

export async function getProjectsForProfileCrew(userId: string) {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);
  if (error) return { projects: [] as Project[], error: true };
  if (!memberships?.length) return { projects: [] as Project[], error: false };
  const result = await getProjectsByIds(memberships.map((row) => row.project_id));
  return { ...result, projects: result.projects.filter((project) => project.owner_id !== userId) };
}

export async function getProjectById(projectId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
    return { project: null, error: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_id, title, slug, short_description, description, status, created_at, updated_at, project_skills(skill:skills(id, slug, name))")
    .eq("id", projectId)
    .maybeSingle();

  if (error) return { project: null, error: true };
  if (!data) return { project: null, error: false };
  const [project] = await attachCrewCounts(await attachOwners([data as unknown as ProjectRow]));
  return { project, error: false };
}
