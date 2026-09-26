"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/browser";

export function UserMenu({ name, username }: { name: string; username: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    await createClient().auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-3 rounded-full p-1.5 pr-3 text-left transition hover:bg-[#f4f5ef]">
        <Avatar name={name} username={username} size="sm" />
        <span className="hidden min-w-0 sm:block"><span className="block max-w-32 truncate text-sm font-semibold text-[#25362d]">{name || username || "Your profile"}</span><span className="block max-w-32 truncate text-xs text-[#879188]">@{username || "profile"}</span></span>
        <span className="text-xs text-[#78867c]" aria-hidden>⌄</span>
      </button>

      {open ? <div className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-[#17251f]/10 bg-[#fcfcf8] p-2 shadow-[0_18px_45px_rgba(23,37,31,0.14)]" role="menu">
        <div className="flex items-center gap-3 border-b border-[#17251f]/10 px-3 py-3"><Avatar name={name} username={username} size="md" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#25362d]">{name || username || "Your profile"}</p><p className="truncate text-xs text-[#879188]">@{username || "profile"}</p></div></div>
        <Link href="/profile" onClick={() => setOpen(false)} className="mt-2 block rounded-xl px-3 py-2.5 text-sm font-medium text-[#4c5d52] hover:bg-[#f4f5ef]" role="menuitem">Profile</Link>
        <button type="button" disabled className="block w-full cursor-not-allowed rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#a0aaa2]" role="menuitem">Settings <span className="ml-1 text-[0.65rem] uppercase tracking-wider">Soon</span></button>
        <button type="button" onClick={logout} disabled={isLoggingOut} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#9e4639] hover:bg-[#fff3f0] disabled:opacity-60" role="menuitem">{isLoggingOut ? "Logging out..." : "Log out"}</button>
      </div> : null}
    </div>
  );
}
