import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type AuthenticatedUser = { id: string };

export type AuthState =
  | { status: "unauthenticated"; user: null; onboardingCompleted: false }
  | { status: "auth-error"; user: null; onboardingCompleted: false }
  | { status: "profile-error"; user: AuthenticatedUser; onboardingCompleted: false }
  | { status: "onboarding-incomplete"; user: AuthenticatedUser; onboardingCompleted: false }
  | { status: "authenticated"; user: AuthenticatedUser; onboardingCompleted: true };

export type ResolvedAuthState = Extract<AuthState, { status: "onboarding-incomplete" | "authenticated" }>;

export async function getAuthState(): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { status: "unauthenticated", user: null, onboardingCompleted: false };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let userId: string;
  try {
    supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) return { status: "auth-error", user: null, onboardingCompleted: false };
    if (!data.user) return { status: "unauthenticated", user: null, onboardingCompleted: false };
    userId = data.user.id;
  } catch {
    return { status: "auth-error", user: null, onboardingCompleted: false };
  }

  const user = { id: userId };
  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) return { status: "profile-error", user, onboardingCompleted: false };
    if (profile?.onboarding_completed === true) {
      return { status: "authenticated", user, onboardingCompleted: true };
    }
    return { status: "onboarding-incomplete", user, onboardingCompleted: false };
  } catch {
    return { status: "profile-error", user, onboardingCompleted: false };
  }
}

/** Redirect only when state is known; transient auth/profile failures reach an error boundary. */
export function requireResolvedAuthState(state: AuthState): ResolvedAuthState {
  if (state.status === "auth-error" || state.status === "profile-error") {
    throw new Error("CrewLab could not confirm your session. Please try again.");
  }
  if (state.status === "unauthenticated") redirect("/auth");
  return state;
}
