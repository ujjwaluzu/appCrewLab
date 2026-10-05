"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { getInitials } from "@/lib/profile-utils";
import type { UserProfile } from "@/lib/profile";

const nav = [
  ["/home", "Home", "home"], ["/my-projects", "My Projects", "my-projects"], ["/projects", "Projects", "projects"],
  ["/my-crew", "My Crew", "crew"], ["/discussion", "Discussion", "discussion"], ["/applications", "Applications", "applications"], ["/github", "GitHub", "github"],
] as const;
type Scope = "projects" | "builders" | "skills" | "discussions";

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
    "my-projects": <><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 9h18" /></>,
    projects: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h4" /></>,
    crew: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20zM16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4V20h-3" /></>,
    discussion: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3.5-.7L4 20l1.2-3.7A7.1 7.1 0 0 1 4 12.5 7.5 7.5 0 0 1 12 5a7.5 7.5 0 0 1 8 6.5Z" /></>,
    applications: <><path d="M8 4h8l4 4v12H4V4z" /><path d="M8 12h8M8 16h8" /></>, github: <><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.8A5.3 5.3 0 0 0 18.9 5a4.9 4.9 0 0 0-.1-3.8S17.6.9 15 2.8a13.4 13.4 0 0 0-7 0C5.4.9 4.2 1.2 4.2 1.2A4.9 4.9 0 0 0 4.1 5a5.3 5.3 0 0 0-1.4 3.7c0 5.3 3.2 6.5 6.2 6.8A3.4 3.4 0 0 0 8 18.1V22" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function SearchBar() {
  const [query, setQuery] = useState(""); const [scope, setScope] = useState<Scope>("projects"); const [results, setResults] = useState<{ title: string; subtitle: string; href: string }[]>([]); const [open, setOpen] = useState(false); const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); setOpen(true); } if (e.key === "Escape") setOpen(false); if (open && e.key === "ArrowDown") { e.preventDefault(); setActive((v) => Math.min(v + 1, results.length - 1)); } if (open && e.key === "ArrowUp") { e.preventDefault(); setActive((v) => Math.max(v - 1, 0)); } if (open && e.key === "Enter") { e.preventDefault(); window.location.href = active >= 0 && results[active] ? results[active].href : `/search?q=${encodeURIComponent(query)}&in=${scope}`; } };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [open, results, active, query, scope]);
  useEffect(() => { if (!query.trim()) return; const timer = setTimeout(async () => { try { const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&in=${scope}`); const data = await response.json(); setResults(data.results ?? []); setOpen(true); setActive(-1); } catch { setResults([]); } }, 250); return () => clearTimeout(timer); }, [query, scope]);
  const scopes: Scope[] = ["projects", "builders", "skills", "discussions"];
  return <div className="search-area">
    <div className="search-pill"><button className="search-submit" aria-label="Search CrewLab" onClick={() => {input.current?.focus();setOpen(true);}}><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></svg></button><input ref={input} value={query} onFocus={() => query && setOpen(true)} onChange={(e) => setQuery(e.target.value)} placeholder="Search CrewLab" aria-label="Search CrewLab"/><span className="search-in">In:</span><div className="search-scopes">{scopes.map((item) => <button key={item} onClick={() => setScope(item)} className={scope === item ? "is-selected" : ""}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></div>
    {open && query.trim() ? <div className="search-results" role="listbox" aria-label={`${scope} search results`}>{results.length ? results.slice(0, 5).map((item, i) => <Link role="option" aria-selected={active === i} key={`${item.href}-${item.title}`} href={item.href} onClick={() => setOpen(false)} className="search-result"><b>{item.title}</b><span>{item.subtitle}</span></Link>) : <p className="search-no-results">No {scope} found.</p>}<Link className="search-all" href={`/search?q=${encodeURIComponent(query)}&in=${scope}`} onClick={() => setOpen(false)}>See all results <span>→</span></Link></div> : null}
  </div>;
}

function TopActions() {
  const [open, setOpen] = useState(false); const [items, setItems] = useState<{ id: string; text: string; createdAt: string }[]>([]); const [unread,setUnread]=useState<string[]>([]);
  useEffect(() => { fetch("/api/notifications").then((r) => r.ok ? r.json() : { items: [] }).then((d) => {const next=d.items??[];setItems(next);try{const read=JSON.parse(localStorage.getItem("crewlab-read-notifications")||"[]") as string[];setUnread(next.filter((item:{id:string})=>!read.includes(item.id)).map((item:{id:string})=>item.id));}catch{setUnread(next.map((item:{id:string})=>item.id));}}).catch(() => setItems([])); }, []);
  const toggleNotifications=()=>setOpen((v)=>{if(!v){const read=[...new Set([...unread,...items.map((item)=>item.id)])];localStorage.setItem("crewlab-read-notifications",JSON.stringify(read));setUnread([]);}return !v;});
  return <><div className="top-actions"><div className="notification-wrap"><button className="top-icon-button" aria-label="Notifications" aria-expanded={open} onClick={toggleNotifications}><svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unread.length ? <span className="notification-count">{unread.length}</span> : null}</button>{open ? <div className="notification-popover"><h2>Notifications</h2>{items.length ? items.slice(0, 5).map((n) => <Link key={n.id} href="/applications" onClick={() => setOpen(false)}><b>{n.text}</b><small>{new Date(n.createdAt).toLocaleDateString()}</small></Link>) : <p>You&apos;re all caught up.</p>}<Link className="notification-all" href="/applications">Applications →</Link></div> : null}</div><Link href="/settings" className="top-icon-button" aria-label="Settings"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.7a8 8 0 0 1-1.8 1L15.6 21h-3l-.3-1.9a8 8 0 0 1-1.8-1l-1.7.7-1.5-2.6 1.5-1.2a7 7 0 0 1 0-2l-1.5-1.2 1.5-2.6 1.7.7a8 8 0 0 1 1.8-1L12.6 7h3l.3 1.9a8 8 0 0 1 1.8 1l1.7-.7 1.5 2.6-1.5 1.2a7 7 0 0 1 0 2Z"/></svg></Link></div></>;
}

function MobileSidebarActions({onNavigate}:{onNavigate:()=>void}) {
  const path=usePathname();const pathIsSettings=path==="/settings"||path==="/profile";
  const [open,setOpen]=useState(false);const [items,setItems]=useState<{id:string;text:string;createdAt:string}[]>([]);const [unread,setUnread]=useState<string[]>([]);
  useEffect(()=>{fetch("/api/notifications").then(r=>r.ok?r.json():{items:[]}).then(data=>{const next=data.items??[];setItems(next);try{const read=JSON.parse(localStorage.getItem("crewlab-read-notifications")||"[]") as string[];setUnread(next.filter((item:{id:string})=>!read.includes(item.id)).map((item:{id:string})=>item.id));}catch{setUnread(next.map((item:{id:string})=>item.id));}}).catch(()=>setItems([]));},[]);
  const toggle=()=>setOpen(value=>{if(!value){localStorage.setItem("crewlab-read-notifications",JSON.stringify([...new Set([...unread,...items.map(item=>item.id)])]));setUnread([]);}return !value;});
  const dismiss=()=>{setOpen(false);onNavigate();};
  return <div className="sidebar-actions"><div className="sidebar-notification-wrap"><button className="workspace-nav-item sidebar-action" type="button" aria-expanded={open} onClick={toggle}><span className="workspace-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></span><span>Notifications</span>{unread.length?<span className="sidebar-notification-count">{unread.length}</span>:null}</button>{open?<div className="sidebar-notification-list"><h2>Notifications</h2>{items.length?items.slice(0,5).map(item=><Link key={item.id} href="/applications" onClick={dismiss}><b>{item.text}</b><small>{new Date(item.createdAt).toLocaleDateString()}</small></Link>):<p>You&apos;re all caught up.</p>}<Link href="/applications" className="sidebar-notification-all" onClick={dismiss}>Applications <span aria-hidden="true">→</span></Link></div>:null}</div><Link href="/settings" onClick={onNavigate} aria-current={pathIsSettings?"page":undefined} className={`workspace-nav-item sidebar-action ${pathIsSettings?"is-active":""}`}><span className="workspace-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.7a8 8 0 0 1-1.8 1L15.6 21h-3l-.3-1.9a8 8 0 0 1-1.8-1l-1.7.7-1.5-2.6 1.5-1.2a7 7 0 0 1 0-2l-1.5-1.2 1.5-2.6 1.7.7a8 8 0 0 1 1.8-1L12.6 7h3l.3 1.9a8 8 0 0 1 1.8 1l1.7-.7 1.5 2.6-1.5 1.2a7 7 0 0 1 0 2Z"/></svg></span><span>Settings</span></Link></div>;
}

export function AppShell({ profile, active, children }: { profile: UserProfile; active: "home" | "profile" | "my-projects" | "projects" | "my-crew" | "discussion" | "github" | "applications"; children: ReactNode }) {
  const path = usePathname(); const [drawer, setDrawer] = useState(false); const name = profile.display_name || profile.username || "Builder"; const menuButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!drawer)return;const panel=document.getElementById("mobile-navigation-drawer");panel?.querySelector<HTMLElement>('a[href],button:not([disabled])')?.focus();const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();setDrawer(false);menuButton.current?.focus();return;}if(event.key==="Tab"){const focusable=Array.from(panel?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')??[]);if(!focusable.length)return;const first=focusable[0];const last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};document.addEventListener("keydown",onKeyDown);return()=>document.removeEventListener("keydown",onKeyDown);},[drawer]);
  const closeDrawer=()=>{setDrawer(false);menuButton.current?.focus();};
  return <div className="product-shell"><aside className="workspace-sidebar"><div><Brand/><p className="workspace-sidebar-label">Workspace</p><nav className="workspace-nav" aria-label="Workspace navigation">{nav.map(([href, label, icon]) => { const selected = active === icon || path === href || (href !== "/home" && path.startsWith(`${href}/`)); return <Link key={href} href={href} aria-current={selected ? "page" : undefined} className={`workspace-nav-item ${selected ? "is-active" : ""}`}><span className="workspace-nav-icon"><Icon name={icon}/></span>{label}</Link>; })}</nav></div><Link href="/profile" className="sidebar-user"><span className="sidebar-avatar">{getInitials(name, profile.username)}</span><span><b>{name}</b><small>@{profile.username || "builder"}</small></span></Link></aside>
    {drawer ? <div className="mobile-drawer-backdrop" onClick={closeDrawer}><aside id="mobile-navigation-drawer" role="dialog" aria-modal="true" aria-label="Workspace navigation" className="mobile-drawer" onClick={(e) => e.stopPropagation()}><button className="drawer-close" onClick={closeDrawer} aria-label="Close menu">×</button><Brand/><p className="workspace-sidebar-label">Workspace</p><nav className="workspace-nav">{nav.map(([href,label,icon]) => {const selected=active===icon||path===href||(href!=="/home"&&path.startsWith(`${href}/`));return <Link key={href} href={href} onClick={closeDrawer} aria-current={selected?"page":undefined} className={`workspace-nav-item ${selected?"is-active":""}`}><span className="workspace-nav-icon"><Icon name={icon}/></span>{label}</Link>;})}</nav><MobileSidebarActions onNavigate={closeDrawer}/><Link href="/profile" onClick={closeDrawer} className="sidebar-user"><span className="sidebar-avatar">{getInitials(name,profile.username)}</span><span><b>{name}</b><small>@{profile.username || "builder"}</small></span></Link></aside></div> : null}
    <div className="workspace-main-column"><header className="workspace-topbar"><button ref={menuButton} className="mobile-menu-button" aria-label="Open navigation menu" aria-expanded={drawer} aria-controls="mobile-navigation-drawer" onClick={() => setDrawer(true)}><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><SearchBar/><TopActions/></header><main className="workspace-main">{children}</main></div>
  </div>;
}
