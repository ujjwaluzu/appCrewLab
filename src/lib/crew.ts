import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectSkill } from "@/lib/projects";

export type JoinRequestStatus = "pending" | "accepted" | "rejected";

export type CrewProfile = {
  id: string;
  display_name: string;
  username: string | null;
  skills: ProjectSkill[];
};

export type CrewMember = CrewProfile & {
  joined_at: string | null;
  is_owner: boolean;
};

export type PendingJoinRequest = {
  id: string;
  created_at: string;
  motivation: string | null;
  contribution: string | null;
  availability: string | null;
  additional_information: string | null;
  application_legacy: boolean;
  user: CrewProfile;
  project?: { id: string; title: string };
};

export type PendingOwnerApplication = PendingJoinRequest & {
  project: { id: string; title: string };
};

export async function getCrewProfilesByIds(ids: string[]) {
  if (!ids.length) return { profiles: new Map<string, CrewProfile>(), error: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_visible_project_profiles", { target_profile_ids: [...new Set(ids)] });
  if (error) return { profiles: new Map<string, CrewProfile>(), error: true };
  const profiles = new Map<string, CrewProfile>();
  for (const row of data ?? []) {
    let profile = profiles.get(row.profile_id);
    if (!profile) {
      profile = { id: row.profile_id, display_name: row.display_name || row.username || "CrewLab builder", username: row.username, skills: [] };
      profiles.set(row.profile_id, profile);
    }
    if (row.skill_id) profile.skills.push({ id: row.skill_id, slug: row.skill_slug, name: row.skill_name });
  }
  return { profiles, error: false };
}

export async function getPendingOwnerApplications(userId: string): Promise<{ requests: PendingOwnerApplication[]; count: number | null; error: boolean }> {
  try {
    const supabase = await createClient();
    const { data, count, error } = await supabase
      .from("join_requests")
      .select("id, project_id, user_id, created_at, motivation, contribution, availability, additional_information, application_legacy, project:projects!inner(id, title, owner_id)", { count: "exact" })
      .eq("project.owner_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { requests: [], count: null, error: true };

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      project_id: string;
      user_id: string;
      created_at: string;
      motivation: string | null;
      contribution: string | null;
      availability: string | null;
      additional_information: string | null;
      application_legacy: boolean;
      project: { id: string; title: string; owner_id: string } | Array<{ id: string; title: string; owner_id: string }>;
    }>;
    const profiles = await getCrewProfilesByIds(rows.map((row) => row.user_id));
    if (profiles.error) return { requests: [], count: count ?? 0, error: true };

    const requests: PendingOwnerApplication[] = rows.flatMap((row) => {
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      if (!project || project.owner_id !== userId) return [];
      return [{
        id: row.id,
        created_at: row.created_at,
        motivation: row.motivation,
        contribution: row.contribution,
        availability: row.availability,
        additional_information: row.additional_information,
        application_legacy: row.application_legacy,
        user: profiles.profiles.get(row.user_id) ?? { id: row.user_id, display_name: "CrewLab builder", username: null, skills: [] },
        project: { id: project.id, title: project.title },
      }];
    });
    return { requests, count: count ?? 0, error: false };
  } catch {
    return { requests: [], count: null, error: true };
  }
}

export async function getProfilesForProjects(projects: Project[]) {
  const byProject = new Map<string, CrewProfile[]>();
  if (!projects.length) return { profiles: byProject, error: false };
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("project_members")
    .select("project_id, user_id")
    .in("project_id", projects.map((project) => project.id));
  if (error) return { profiles: byProject, error: true };
  const projectOwners = new Map(projects.map((project) => [project.id, project.owner_id]));
  const rows = (memberships ?? []).filter((row) => row.user_id !== projectOwners.get(row.project_id));
  const result = await getCrewProfilesByIds(rows.map((row) => row.user_id));
  if (result.error) return { profiles: byProject, error: true };
  for (const row of rows) {
    const person = result.profiles.get(row.user_id);
    if (!person) continue;
    byProject.set(row.project_id, [...(byProject.get(row.project_id) ?? []), person]);
  }
  return { profiles: byProject, error: false };
}

export async function getProjectCrewData(project: Project, viewerId: string): Promise<{
  members: CrewMember[];
  requestStatus: JoinRequestStatus | null;
  requestId: string | null;
  pendingRequests: PendingJoinRequest[];
  error: boolean;
}> {
  const supabase = await createClient();
  const isOwner = project.owner_id === viewerId;
  const [membersResult, requestResult, ownerRequestsResult] = await Promise.all([
    supabase.from("project_members").select("user_id, joined_at").eq("project_id", project.id).order("joined_at", { ascending: true }),
    isOwner
      ? Promise.resolve({ data: null, error: null })
      : supabase.from("join_requests").select("id, status, created_at").eq("project_id", project.id).eq("user_id", viewerId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    isOwner
      ? supabase.from("join_requests").select("id, user_id, created_at, motivation, contribution, availability, additional_information, application_legacy").eq("project_id", project.id).eq("status", "pending").order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (membersResult.error || requestResult.error || ownerRequestsResult.error) {
    return { members: [] as CrewMember[], requestStatus: null as JoinRequestStatus | null, requestId: null as string | null, pendingRequests: [] as PendingJoinRequest[], error: true };
  }

  const memberRows = membersResult.data ?? [];
  const pendingRows = ownerRequestsResult.data ?? [];
  const profilesResult = await getCrewProfilesByIds([project.owner_id, ...memberRows.map((member) => member.user_id), ...pendingRows.map((request) => request.user_id)]);
  if (profilesResult.error) {
    return { members: [] as CrewMember[], requestStatus: null, requestId: null, pendingRequests: [] as PendingJoinRequest[], error: true };
  }
  const profiles = profilesResult.profiles;
  const ownerProfile = profiles.get(project.owner_id) ?? {
    id: project.owner_id,
    display_name: project.owner?.display_name || project.owner?.username || "CrewLab builder",
    username: project.owner?.username ?? null,
    skills: [],
  };
  const members: CrewMember[] = [
    { ...ownerProfile, joined_at: null, is_owner: true },
    ...memberRows
      .filter((member) => member.user_id !== project.owner_id)
      .map((member) => ({
        ...(profiles.get(member.user_id) ?? { id: member.user_id, display_name: "CrewLab builder", username: null, skills: [] }),
        joined_at: member.joined_at,
        is_owner: false,
      })),
  ];
  const pendingRequests: PendingJoinRequest[] = pendingRows.map((request) => ({
    id: request.id,
    created_at: request.created_at,
    motivation: request.motivation,
    contribution: request.contribution,
    availability: request.availability,
    additional_information: request.additional_information,
    application_legacy: request.application_legacy,
    user: profiles.get(request.user_id) ?? { id: request.user_id, display_name: "CrewLab builder", username: null, skills: [] },
  }));
  const isMember = memberRows.some((member) => member.user_id === viewerId);
  const storedStatus = requestResult.data?.status as JoinRequestStatus | undefined;
  const requestStatus = isMember ? "accepted" : storedStatus === "accepted" ? null : storedStatus ?? null;

  return { members, requestStatus, requestId: requestStatus === "pending" ? requestResult.data?.id ?? null : null, pendingRequests, error: false };
}
