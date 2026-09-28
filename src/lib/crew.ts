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
  user: CrewProfile;
};

async function getProfiles(ids: string[]) {
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
      ? supabase.from("join_requests").select("id, user_id, created_at").eq("project_id", project.id).eq("status", "pending").order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (membersResult.error || requestResult.error || ownerRequestsResult.error) {
    return { members: [] as CrewMember[], requestStatus: null as JoinRequestStatus | null, requestId: null as string | null, pendingRequests: [] as PendingJoinRequest[], error: true };
  }

  const memberRows = membersResult.data ?? [];
  const pendingRows = ownerRequestsResult.data ?? [];
  const profilesResult = await getProfiles([project.owner_id, ...memberRows.map((member) => member.user_id), ...pendingRows.map((request) => request.user_id)]);
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
    user: profiles.get(request.user_id) ?? { id: request.user_id, display_name: "CrewLab builder", username: null, skills: [] },
  }));
  const isMember = memberRows.some((member) => member.user_id === viewerId);
  const storedStatus = requestResult.data?.status as JoinRequestStatus | undefined;
  const requestStatus = isMember ? "accepted" : storedStatus === "accepted" ? null : storedStatus ?? null;

  return { members, requestStatus, requestId: requestStatus === "pending" ? requestResult.data?.id ?? null : null, pendingRequests, error: false };
}
