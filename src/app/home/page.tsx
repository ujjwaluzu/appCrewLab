import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getHomeDashboardData } from "@/lib/dashboard";
import { getCurrentUserProfile } from "@/lib/profile";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const auth = requireResolvedAuthState(await getAuthState()); if (auth.status === "onboarding-incomplete") redirect("/onboarding");
  const [profile,dashboard]=await Promise.all([getCurrentUserProfile(auth.user.id),getHomeDashboardData(auth.user.id)]);
  const today=new Date().toISOString().slice(0,10);
  return <AppShell profile={profile} active="home"><HomeDashboard name={profile.display_name||profile.username||"Builder"} today={today} projects={dashboard.projects.items} crew={dashboard.crew.items} counts={{projects:dashboard.projects.count,crew:dashboard.crew.count,incoming:dashboard.incoming.count,pending:dashboard.outgoing.count}} errors={[dashboard.projects.error,dashboard.crew.error,dashboard.incoming.error,dashboard.outgoing.error]}/></AppShell>;
}
