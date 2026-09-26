import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AuthState = {
  user: { id: string } | null;
  onboardingCompleted: boolean;
};

export async function getAuthState(): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { user: null, onboardingCompleted: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { user: null, onboardingCompleted: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    user: { id: data.user.id },
    onboardingCompleted: profile?.onboarding_completed === true,
  };
}
