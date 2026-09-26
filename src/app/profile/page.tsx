import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { Avatar } from "@/components/ui/Avatar";
import { getIntentLabel } from "@/data/intents";
import { getAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
import { getProfileCompletion } from "@/lib/profile-utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const auth = await getAuthState();
  if (!auth.user) redirect("/auth");
  if (!auth.onboardingCompleted) redirect("/onboarding");

  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/onboarding");

  const displayName = profile.display_name || profile.username || "CrewLab builder";
  const completion = getProfileCompletion(profile, profile.skills.length);

  return <AppShell profile={profile} active="profile"><div className="mx-auto max-w-5xl"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Your profile</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">A clear picture of what you bring.</h1></div><ProfileEditor profile={profile} /></div><section className="mt-10 rounded-3xl border border-[#17251f]/10 bg-[#fcfcf8] p-6 shadow-[0_14px_40px_rgba(23,37,31,0.05)] sm:p-9"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><Avatar name={profile.display_name} username={profile.username} size="xl" /><div><h2 className="text-3xl font-semibold tracking-[-0.05em]">{displayName}</h2><p className="mt-2 text-sm font-semibold text-[#718077]">@{profile.username || "profile"}</p><p className="mt-4 max-w-2xl text-base leading-7 text-[#59665d]">{profile.bio || "No bio yet."}</p></div></div><div className="mt-9 grid gap-8 border-t border-[#17251f]/10 pt-8 lg:grid-cols-[1fr_0.8fr]"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#738178]">Skills</p>{profile.skills.length ? <div className="mt-4 flex flex-wrap gap-2">{profile.skills.map((skill) => <span key={skill.id || skill.slug} className="rounded-full bg-[#f0f5df] px-3.5 py-2 text-sm font-semibold text-[#40513c]">{skill.name}</span>)}</div> : <p className="mt-4 text-sm leading-6 text-[#69766e]">Add your skills to help people understand what you bring to a project.</p>}</div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#738178]">Looking for</p>{profile.intents.length ? <div className="mt-4 space-y-2">{profile.intents.map((intent) => <p key={intent} className="text-sm font-semibold text-[#4f6055]">• {getIntentLabel(intent)}</p>)}</div> : <p className="mt-4 text-sm text-[#69766e]">Nothing selected yet.</p>}</div></div></section><section className="mt-5 rounded-3xl border border-[#17251f]/10 bg-[#f0f5df] p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d806c]">Profile strength</p><h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#334b37]">You&apos;re {completion}% there.</h2></div><span className="text-2xl font-semibold tracking-[-0.04em] text-[#334b37]">{completion}%</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#d6e1b9]"><div className="h-full rounded-full bg-[#17251f]" style={{ width: `${completion}%` }} /></div><p className="mt-4 text-sm leading-6 text-[#61745f]">A thoughtful profile helps future collaborators understand where you can make an impact.</p></section></div></AppShell>;
}
