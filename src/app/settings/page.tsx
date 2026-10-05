import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { Avatar } from "@/components/ui/Avatar";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
export const dynamic="force-dynamic";
export default async function SettingsPage(){const auth=requireResolvedAuthState(await getAuthState());if(auth.status==="onboarding-incomplete")redirect("/onboarding");const profile=await getCurrentUserProfile(auth.user.id);return <AppShell profile={profile} active="profile"><div className="workspace-page settings-page"><p className="workspace-eyebrow">Workspace</p><h1>Settings</h1><p className="workspace-lede">Manage your builder identity.</p><section className="settings-profile-card"><div className="settings-profile-summary"><Avatar name={profile.display_name} username={profile.username} size="lg"/><div><h2>{profile.display_name}</h2><p>@{profile.username}</p></div></div><ProfileEditor profile={profile}/></section></div></AppShell>}
