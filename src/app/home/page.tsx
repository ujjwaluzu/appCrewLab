import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { getAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
import { getProfileCompletion } from "@/lib/profile-utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const auth = await getAuthState();
  if (!auth.user) redirect("/auth");
  if (!auth.onboardingCompleted) redirect("/onboarding");

  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/onboarding");

  const name = profile.display_name || profile.username || "Builder";
  const completion = getProfileCompletion(profile, profile.skills.length);

  return <AppShell profile={profile} active="home"><div className="mx-auto max-w-5xl"><div className="animate-fade-in"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Your workspace</p><h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.06em] sm:text-6xl">Good morning, {name.split(" ")[0]}.</h1><p className="mt-4 max-w-xl text-lg leading-8 text-[#59665d]">Let&apos;s build something that matters.</p></div><div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]"><section className="rounded-3xl bg-[#17251f] p-6 text-[#f8faef] shadow-[0_18px_45px_rgba(23,37,31,0.12)] sm:p-8"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b8c99a]">Your profile</p><h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Make it easy for the right people to find you.</h2></div><Avatar name={profile.display_name} username={profile.username} size="lg" /></div><div className="mt-8"><div className="flex items-center justify-between text-sm"><span className="text-[#c8d2c5]">Profile strength</span><span className="font-semibold text-[#e7ff70]">{completion}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#e7ff70] transition-all" style={{ width: `${completion}%` }} /></div><p className="mt-4 text-sm leading-6 text-[#b7c4b7]">Complete your profile to help people understand what you bring to a project.</p></div><Link href="/profile" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#e7ff70] px-5 py-3 text-sm font-semibold text-[#17251f] transition hover:-translate-y-0.5">View your profile <span aria-hidden>→</span></Link></section><section className="rounded-3xl border border-[#17251f]/10 bg-[#fcfcf8] p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#738178]">Coming next</p><h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Projects and your crew.</h2><p className="mt-4 text-sm leading-7 text-[#69766e]">We&apos;re making space for the ideas, collaborators, and momentum that come next.</p><div className="mt-8 flex items-center gap-2 text-sm font-semibold text-[#617066]"><span className="h-2 w-2 rounded-full bg-[#b7c58b]" /> On the way</div></section></div></div></AppShell>;
}
