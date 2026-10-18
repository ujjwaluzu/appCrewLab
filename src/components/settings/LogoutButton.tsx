"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    await createClient().auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  return <button type="button" onClick={logout} disabled={isLoggingOut} className="settings-logout-button">
    {isLoggingOut ? "Logging out..." : "Log out"}
  </button>;
}
