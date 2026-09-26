"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await createClient().auth.signOut();
      router.replace("/auth");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="rounded-full border border-[#17251f]/15 px-5 py-3 text-sm font-semibold text-[#33433a] transition hover:border-[#17251f]/35 hover:bg-[#f4f5ef] disabled:opacity-60">{isLoggingOut ? "Logging out…" : "Log out"}</button>;
}
