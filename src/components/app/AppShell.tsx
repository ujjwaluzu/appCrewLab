"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/app/UserMenu";
import type { UserProfile } from "@/lib/profile";

function NavItem({ href, label, active, collapsed, icon }: { href: string; label: string; active?: boolean; collapsed?: boolean; icon: "home" | "my-projects" | "projects" | "crew" | "discussion" | "github" | "applications" }) {
  return (
    <Link href={href} className={`workspace-nav-item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined}>
      <span className="workspace-nav-icon" aria-hidden="true">
        {icon === "home" ? <svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg> : null}
        {icon === "my-projects" ? <svg viewBox="0 0 24 24"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 9h18" /></svg> : null}
        {icon === "projects" ? <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h4" /></svg> : null}
        {icon === "crew" ? <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20zM16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4V20h-3" /></svg> : null}
        {icon === "discussion" ? <svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3.5-.7L4 20l1.2-3.7A7.1 7.1 0 0 1 4 12.5 7.5 7.5 0 0 1 12 5a7.5 7.5 0 0 1 8 6.5Z" /><path d="M8 12h8M8 15h5" /></svg> : null}
        {icon === "github" ? <svg viewBox="0 0 24 24"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.8A5.3 5.3 0 0 0 18.9 5a4.9 4.9 0 0 0-.1-3.8S17.6.9 15 2.8a13.4 13.4 0 0 0-7 0C5.4.9 4.2 1.2 4.2 1.2A4.9 4.9 0 0 0 4.1 5a5.3 5.3 0 0 0-1.4 3.7c0 5.3 3.2 6.5 6.2 6.8A3.4 3.4 0 0 0 8 18.1V22" /></svg> : null}
        {icon === "applications" ? <svg viewBox="0 0 24 24"><path d="M8 4h8l4 4v12H4V4z" /><path d="M8 12h8M8 16h8M14 4v5h5" /></svg> : null}
      </span>
      <span className="workspace-nav-label">{label}</span>
    </Link>
  );
}

export function AppShell({ profile, active, children }: { profile: UserProfile; active: "home" | "profile" | "my-projects" | "projects" | "my-crew" | "discussion" | "github" | "applications"; children: ReactNode }) {
  const displayName = profile.display_name || profile.username || "Builder";
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="product-shell h-dvh text-[#171512]">
      <header className="workspace-mobile-header md:hidden">
        <div className="flex items-center justify-between gap-4"><Brand /><UserMenu name={displayName} username={profile.username} /></div>
        <nav className="workspace-mobile-nav" aria-label="Workspace navigation">
          <NavItem href="/home" label="Home" icon="home" active={active === "home"} />
          <NavItem href="/my-projects" label="My Projects" icon="my-projects" active={active === "my-projects"} />
          <NavItem href="/projects" label="Projects" icon="projects" active={active === "projects"} />
          <NavItem href="/my-crew" label="My Crew" icon="crew" active={active === "my-crew"} />
          <NavItem href="/discussion" label="Discussion" icon="discussion" active={active === "discussion"} />
          <NavItem href="/applications" label="Applications" icon="applications" active={active === "applications"} />
          <NavItem href="/github" label="GitHub" icon="github" active={active === "github"} />
        </nav>
      </header>

      <div className="workspace-layout flex min-h-0 w-full flex-1 overflow-hidden">
        <aside className={`workspace-sidebar hidden md:flex ${sidebarOpen ? "" : "is-collapsed"}`} aria-label="Workspace sidebar">
          <div className="workspace-sidebar-head">
            {sidebarOpen ? <Brand /> : null}
            <button type="button" className="workspace-sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={sidebarOpen} title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d={sidebarOpen ? "M9 4v16M15 9l-3 3 3 3" : "M9 9l3 3-3 3M15 4v16"} /></svg>
            </button>
          </div>
          <div className="mt-8">
            {sidebarOpen ? <p className="workspace-sidebar-label">Workspace</p> : null}
            <nav className="mt-3 space-y-1" aria-label="Workspace navigation">
              <NavItem href="/home" label="Home" icon="home" active={active === "home"} collapsed={!sidebarOpen} />
              <NavItem href="/my-projects" label="My Projects" icon="my-projects" active={active === "my-projects"} collapsed={!sidebarOpen} />
              <NavItem href="/projects" label="Projects" icon="projects" active={active === "projects"} collapsed={!sidebarOpen} />
              <NavItem href="/my-crew" label="My Crew" icon="crew" active={active === "my-crew"} collapsed={!sidebarOpen} />
              <NavItem href="/discussion" label="Discussion" icon="discussion" active={active === "discussion"} collapsed={!sidebarOpen} />
              <NavItem href="/applications" label="Applications" icon="applications" active={active === "applications"} collapsed={!sidebarOpen} />
              <NavItem href="/github" label="GitHub" icon="github" active={active === "github"} collapsed={!sidebarOpen} />
            </nav>
          </div>
        </aside>

        <div className="workspace-main-column flex min-w-0 flex-1 flex-col">
          <header className="workspace-topbar hidden md:flex">
            <UserMenu name={displayName} username={profile.username} />
          </header>
          <main className="workspace-main flex-1 px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
