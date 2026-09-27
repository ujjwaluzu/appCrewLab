import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/app/UserMenu";
import type { UserProfile } from "@/lib/profile";

function NavItem({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return <Link href={href} className={`workspace-nav-item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>{label}</Link>;
}

function ComingSoon() {
  return <span className="workspace-nav-soon"><span>Projects</span><small>Soon</small></span>;
}

export function AppShell({ profile, active, children }: { profile: UserProfile; active: "home" | "profile"; children: ReactNode }) {
  const displayName = profile.display_name || profile.username || "Builder";

  return (
    <div className="product-shell min-h-screen text-[#171512]">
      <header className="workspace-mobile-header md:hidden">
        <div className="flex items-center justify-between gap-4"><Brand /><UserMenu name={displayName} username={profile.username} /></div>
        <nav className="workspace-mobile-nav" aria-label="Workspace navigation">
          <NavItem href="/home" label="Home" active={active === "home"} />
          <ComingSoon />
          <span className="workspace-nav-soon"><span>My Crew</span><small>Soon</small></span>
        </nav>
      </header>

      <div className="workspace-layout mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="workspace-sidebar hidden md:flex">
          <Brand />
          <div className="mt-12">
            <p className="workspace-sidebar-label">Workspace</p>
            <nav className="mt-3 space-y-1" aria-label="Workspace navigation">
              <NavItem href="/home" label="Home" active={active === "home"} />
              <ComingSoon />
              <span className="workspace-nav-soon"><span>My Crew</span><small>Soon</small></span>
            </nav>
          </div>
          <div className="workspace-sidebar-note"><span className="workspace-note-mark">✳</span><p>Good things happen when builders find each other.</p><span className="workspace-note-caption">CrewLab · Build in good company</span></div>
        </aside>

        <div className="workspace-main-column flex min-w-0 flex-1 flex-col">
          <header className="workspace-topbar hidden md:flex">
            <span className="workspace-topbar-label">CrewLab / Workspace</span>
            <UserMenu name={displayName} username={profile.username} />
          </header>
          <main className="workspace-main flex-1 px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
