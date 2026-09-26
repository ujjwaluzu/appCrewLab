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
