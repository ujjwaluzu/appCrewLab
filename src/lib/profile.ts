import { createClient } from "@/lib/supabase/server";

export type ProfileSkill = {
  id?: string;
  slug: string;
  name: string;
};

export type UserProfile = {
  id: string;
  username: string | null;
  display_name: string;
  bio: string | null;
  intents: string[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  skills: ProfileSkill[];
};

export type PublicUserProfile = Pick<UserProfile, "username" | "display_name" | "bio" | "intents" | "created_at" | "skills"> & {
  /** Kept server-side for looking up this user's projects and memberships. */
  id: string;
};

export async function getPublicProfileByUsername(username: string): Promise<{ profile: PublicUserProfile | null; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_profile_by_username", { target_username: username.trim() });
  if (error) return { profile: null, error: true };
  const rows = (data ?? []) as Array<{
    profile_id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
    intents: string[] | null;
    created_at: string;
    skill_id: string | null;
    skill_slug: string | null;
    skill_name: string | null;
  }>;
  if (!rows.length) return { profile: null, error: false };
  const first = rows[0];
  return {
    profile: {
      id: first.profile_id,
      username: first.username,
      display_name: first.display_name || first.username,
      bio: first.bio,
      intents: first.intents ?? [],
      created_at: first.created_at,
      skills: rows.flatMap((row) => row.skill_id && row.skill_slug && row.skill_name
        ? [{ id: row.skill_id, slug: row.skill_slug, name: row.skill_name }]
        : []),
    },
    error: false,
  };
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, intents, onboarding_completed, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: profileSkillRows } = await supabase
    .from("profile_skills")
    .select("skill_id")
    .eq("profile_id", user.id);

  const skillIds = (profileSkillRows ?? []).map((row) => row.skill_id).filter(Boolean);
  let skills: ProfileSkill[] = [];

  if (skillIds.length) {
    const { data: skillRows } = await supabase
      .from("skills")
      .select("id, slug, name")
      .in("id", skillIds);
    skills = skillRows ?? [];
  }

  return {
    ...profile,
    intents: profile.intents ?? [],
    skills,
  };
}
