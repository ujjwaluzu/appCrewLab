import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { SearchResults } from "@/components/search/SearchResults";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
export const dynamic="force-dynamic";
export default async function SearchPage({searchParams}:PageProps<"/search">){const auth=requireResolvedAuthState(await getAuthState());if(auth.status==="onboarding-incomplete")redirect("/onboarding");const p=await searchParams;const q=String(p.q??"").slice(0,100);const scope=String(p.in??"projects");const profile=await getCurrentUserProfile(auth.user.id);return <AppShell profile={profile} active="home"><div className="workspace-page search-page"><p className="workspace-eyebrow">CrewLab discovery</p><h1>Search results</h1><p className="workspace-lede">Results for <strong>“{q}”</strong></p><SearchResults q={q} scope={scope}/></div></AppShell>}
