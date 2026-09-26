import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/app/UserMenu";
import type { UserProfile } from "@/lib/profile";

function NavItem({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return <Link href={href} className={`block rounded-xl px-3.5 py-3 text-sm font-semibold transition ${active ? "bg-[#17251f] text-white shadow-[0_8px_16px_rgba(23,37,31,0.12)]" : "text-[#617066] hover:bg-[#f0f3e9] hover:text-[#17251f]"}`}>{label}</Link>;
}

export function AppShell({ profile, active, children }: { profile: UserProfile; active: "home" | "profile"; children: ReactNode }) {
  const displayName = profile.display_name || profile.username || "Builder";

  return (
    <div className="min-h-screen bg-[#f4f5ef] text-[#17251f]">
      <header className="border-b border-[#17251f]/10 bg-[#fcfcf8] px-5 py-4 md:hidden"><div className="flex items-center justify-between gap-4"><Brand /><UserMenu name={displayName} username={profile.username} /></div><nav className="mt-4 flex gap-2 overflow-x-auto pb-1"><NavItem href="/home" label="Home" active={active === "home"} /><span className="rounded-xl px-3.5 py-3 text-sm font-semibold text-[#a0aaa2]">Projects <small className="ml-1 text-[0.6rem] uppercase tracking-wider">Soon</small></span><span className="rounded-xl px-3.5 py-3 text-sm font-semibold text-[#a0aaa2]">My Crew <small className="ml-1 text-[0.6rem] uppercase tracking-wider">Soon</small></span></nav></header>

      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[#17251f]/10 bg-[#fcfcf8] px-6 py-7 md:flex"><Brand /><div className="mt-12"><p className="mb-4 px-3.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a958d]">Workspace</p><nav className="space-y-1"><NavItem href="/home" label="Home" active={active === "home"} /><span className="flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold text-[#a0aaa2]">Projects <small className="text-[0.6rem] uppercase tracking-wider">Soon</small></span><span className="flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold text-[#a0aaa2]">My Crew <small className="text-[0.6rem] uppercase tracking-wider">Soon</small></span></nav></div><div className="mt-auto rounded-2xl bg-[#f0f5df] p-4"><p className="text-sm font-semibold text-[#334b37]">Build in good company.</p><p className="mt-1 text-xs leading-5 text-[#6d806c]">Projects and your crew are coming next.</p></div></aside>
        <div className="flex min-w-0 flex-1 flex-col"><header className="hidden items-center justify-between border-b border-[#17251f]/10 bg-[#fcfcf8] px-8 py-4 md:flex lg:px-12"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a958d]">CrewLab workspace</p></div><UserMenu name={displayName} username={profile.username} /></header><main className="flex-1 px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">{children}</main></div>
      </div>
    </div>
  );
}
