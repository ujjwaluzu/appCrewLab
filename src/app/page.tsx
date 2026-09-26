import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const { user, onboardingCompleted } = await getAuthState();

  if (!user) {
    redirect("/auth");
  }

  redirect(onboardingCompleted ? "/home" : "/onboarding");
}
