import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const auth = requireResolvedAuthState(await getAuthState());
  if (auth.status === "authenticated") redirect("/home");
  return <OnboardingWizard />;
}
