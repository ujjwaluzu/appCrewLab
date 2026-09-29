import { redirect } from "next/navigation";

import { getAuthState, requireResolvedAuthState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const auth = requireResolvedAuthState(await getAuthState());
  redirect(auth.status === "authenticated" ? "/home" : "/onboarding");
}
